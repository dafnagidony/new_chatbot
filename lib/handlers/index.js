var config = require('../../config');
var server = require('obil-server');
var url = require('url');
var utils = require('../utils');
var api = require('../utils/api');
var swig = require('swig');
var path = require('path');
var messages = require('../utils/messages');
var fsm = require('../utils/fsm');
var helpers = server.utils.helpers;
var createApiError = server.errors;
var request = server.utils.core.request;
var deferred = server.utils.core.defer;
var debug = server.utils.core.debug('obil:dashbot:handlers');
var log = helpers.map().get('loggerAuth');
var request = require('request-promise');
var j = request.jar();
var cheerio = require('cheerio');
var Nohm = require('nohm').Nohm;

// function getMyOutbrain() {
//   var defer = deferred();
//   request({
//     url: 'https://my.outbrain.com/login',
//     jar: j,
//     transform: function (body) {
//       return cheerio.load(body);
//     }
//   })
//   .then(function($) {
//     var cookie_string = j.getCookieString('https://my.outbrain.com/login');
//     var csrf = $('input[name=csrf]').attr('value');
//     defer.resolve([cookie_string, csrf]);
//   })
//   .catch(function(err) {
//     defer.reject(err);
//   });
//   return defer.promise;
// }

// function loginToOutbrain(cookie_string, csrf, userName, userPassword) {
//   var defer = deferred();
//   request({
//     url: 'https://my.outbrain.com/login',
//     method: 'POST',
//     jar: j,
//     headers: {
//       'Host': 'my.outbrain.com',
//       'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
//       'Content-Type': 'application/x-www-form-urlencoded',
//       'Cookie': cookie_string,
//       'Origin': 'http://localhost:3000',
//       'Referer': 'https://my.outbrain.com/',
//       'Upgrade-Insecure-Requests': 1,
//       'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
//     },
//     form: {
//       submitted: true,
//       csrf: csrf,
//       loginUsername: userName,
//       loginPassword: userPassword
//     },
//     json: true
//   })
//   .then(function(res) {
//     defer.reject('Unable to Login');
//   })
//   .catch(function(res) {
//     console.log('=====', res);
//     if (res.statusCode == 302 && res.error == undefined) {
//       if (res.body == null && isValidCookies(j)) {
//         defer.resolve();
//       } else {
//         defer.reject('Unable to Login');
//       }
//     }
//     else {
//       defer.reject(res.error);
//     }   
//   })
//   return defer.promise;
// }

// function isValidCookies(j) {
//   var cookies = j.getCookieString('https://my.outbrain.com/login').split(';');
//   var refCookies = ['JSESSIONID', 'obroute2', 'login', 'ob-session-token'];
//   cookies.forEach(function(element, index, array) {
//     var cookieName=element.split('=')[0].replace(/ /g,'');
//     var index = refCookies.indexOf(cookieName);
//     if (index !== -1) {
//       refCookies.splice(index, 1);
//     }
//   })
//   return refCookies.length === 0;
// }

exports.getWebhook = function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === process.env.VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }  
};


exports.postWebhook = function(req, res) {
  var data = req.body;
  var userModel = helpers.map().get('user');
  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        var senderID = messagingEvent.sender.id;
        req.session.senderID = senderID;
        console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&', messagingEvent, fsm.current,  req.session);
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          utils.receivedMessage(messagingEvent, userModel);
          
        } else if (messagingEvent.delivery) {
          utils.receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          utils.receivedPostback(messagingEvent, userModel);
        } else if (messagingEvent.account_linking) {
          utils.receivedAccountLinking(messagingEvent, userModel);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }        
      });
    });
    res.sendStatus(200);
  }
};

exports.authorize = function(req, res) {
  var url = "https://graph.facebook.com/v2.6/me?access_token="+ process.env.PAGE_ACCESS_TOKEN+ "&fields=recipient&account_linking_token="+req.query.account_linking_token
  request({url: url, json:true}).then(function(resp) {
    
    req.session.senderID = resp.recipient;
    req.session.account_linking_token = req.query.account_linking_token;
    req.session.redirect_uri = req.query.redirect_uri;
    console.log('^^^^^^^^^^^ from authorize: ', req.session);
    res.sendFile(path.join(__dirname+'/../utils/templates/login_template.html'));
  }); 
};



exports.loginOutbrainAccount = function(req, res) {
  var userName = req.body.loginUsername;
  var userPassword = req.body.loginPassword;
  var senderID = req.session.senderID;
  console.log('-----------------', req.session);
  var userModel = helpers.map().get('user');
  api.getInternalApiToken().then(function(resp) {
    var obInternalToken = resp;
    return api.getUserId(obInternalToken, userName).then(function(resp) {
      var userId = resp.id; 
      return api.enableUser(obInternalToken, userId).then(function(resp) {
        return api.getAmplifyToken(userName, userPassword).then(function(resp) {
          var obToken = resp;  
          var prop = [
            {obToken: obToken},
            {name: userName}
          ];
          return userModel.setUserProperties(senderID, prop).then(function(user) {
            var redirectPath = req.session.redirect_uri+ '&authorization_code='+process.env.AUTHORIZATION_CODE;
            res.redirect(redirectPath);  
          });      
        })
        .catch(function(err) {     
        console.log('+++++++++ error:', err); 
          api.disableUser(obInternalToken, userId).then(function(resp) {
            console.log('^^^^^^ disable user is successful', resp);
            res.sendFile(path.join(__dirname+'/../utils/templates/login_template_error.html'));
          });    
        });
      });
    }); 
  })
  .catch(function(err) {
    console.log('@@@@@', err);
    res.sendFile(path.join(__dirname+'/../utils/templates/login_template_error.html'));
  });

};


exports.start = function(req, res) {
  var userModel = helpers.map().get('user');

  var user = {
    created_on: new Date().toISOString(),
    senderID: '1044476422287775'
  };
  console.log(userModel);
  //userModel.setUserStoredPassword('dgidony', '12345').then(function(user) {
  userModel.getBySenderID(user.senderID)
  .then(function(foundUser) {
    if (!foundUser) {
      userModel.add(user).then(function(user) {
        console.log('-----gffgh----- user:', user);          
      });
    } else {
      console.log('-----$$$$$$$$----- user:', foundUser);
    }    
  })
  .catch(function(err) {
    console.log('@@@@@', err);
  });
    userModel.add(user).then(function(user) {
      console.log('-----gffgh----- user:', user);
            
    }).catch(function(err) {
     
    
    });

//});
}