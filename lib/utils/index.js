var request = require('request-promise');
var cache = require('memory-cache');
var moment = require('moment');
var api = require('./api');
var charts = require('./charts');
var utils = require('obil-utils');
var obilUtils = require('obil-server').utils;
var Promise = obilUtils.core.promise;
var deferred = obilUtils.core.defer;
var path = require('path');
var fsm = require('./fsm');
var nlp = require('./nlp');

module.exports.receivedMessage = function(event, userModel){
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
  
  console.log("Received message for user %d and page %d at %d with message:", 
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  if (message.quick_reply) {
    var messagePayload = message.quick_reply.payload;
    if (message.quick_reply.payload.search("accountSelect") !== -1) {
      var start = messagePayload.search("-")+1;
      var account = messagePayload.slice(start);
      userModel.setUserProperties(senderID, [{account: account}]).then(function(user) {
        fsm.chosenEvent(senderID, account);
      });
    } else if (message.quick_reply.payload.search("campaignSelect") !== -1) {
      var start = messagePayload.search("-")+1;
      var campaign = messagePayload.slice(start);
      userModel.setUserProperties(senderID, [{campaign: campaign}]).then(function(user) {
        fsm.chosenEvent(senderID, campaign);
      });
    } else if (message.quick_reply.payload.search("dateSelect") !== -1) {
      sessionObj.date = date;
      sendSelectReportSelectMessage(senderID);
    } else if (message.quick_reply.payload.search("reportSelect") !== -1) {
      cache.put('report', message.text);
      if (message.text === 'Overview') {
        sendOverviewReport(senderID);
      } else {
        sendTrendlineReport(senderID);
      }
    } else if (message.quick_reply.payload.search("switchAccount") !== -1) {
      fsm.selectAccountEvent(senderID, userModel);
    } else if (message.quick_reply.payload.search("switchCampaign") !== -1) {
      fsm.selectCampaignEvent(senderID, userModel);
    } else if (message.quick_reply.payload.search("chooseCampaign") !== -1) {
      fsm.selectCampaignEvent(senderID, userModel);
    } else if (message.quick_reply.payload.search("view") !== -1) {
      fsm.viewEvent(senderID, userModel);
    } else if (message.quick_reply.payload.search("manage") !== -1) {
      fsm.manageEvent(senderID, userModel);
    } 
  }
  else {
    console.log('+_+_+_+_+_+', fsm.current, !isNaN(message.text));
    var options = ['adjustBudget', 'adjustCpc'];
    if (options.indexOf(fsm.current) !== -1  && !isNaN(message.text)) {
      fsm.amountEnteredEvent(senderID, message.text, userModel);
    }
    else {
      console.log('<<<<<<< NLP >>>>>>>>>>');
      nlp.nlpResponse(message.text, senderID, userModel);
    }
  }
}

module.exports.receivedDeliveryConfirmation = function(event) {
//  console.log('___ message delivery confirmation  ', event);
}

module.exports.receivedPostback = function(event, userModel) {
  var senderID = event.sender.id;
  var action = event.postback.payload;

  console.log('+++++++ receivedPostback  ', event);
  if (action == 'get_started') {
    fsm.init(senderID, userModel);
  }
  else if (action === 'accountIsCorrect') {
    fsm.confirmedEvent(senderID, 'account', userModel);
  }
  else if (action === 'campaignIsCorrect') {
    fsm.confirmedEvent(senderID, 'campaign', userModel);
  }
  else if (action === 'accountNotCorrect') {
    fsm.selectAccountEvent(senderID, userModel);
  }
  else if (action === 'campaignNotCorrect') {
    fsm.selectCampaignEvent(senderID, userModel);
  }
  else if (action === "adjustBudget") {
    fsm.adjustBudgetEvent(senderID, userModel);
  } 
  else if (action === "adjustcpc") {
    fsm.adjustCpcEvent(senderID, userModel);
  } 
  else if (action === "campaignStartStop") {
    fsm.turnOnOffEvent(senderID, userModel);
  } 
  else if (action.search("budgetAmountCorrect") !== -1) {
    console.log('((((budgetAmountCorrect)))))) ');
    var start = action.search("-")+1;
  //  var randomStr = action.slice(start);
  //  if (randomStr == sessionObj.randomStr){
      fsm.changeConfirmedEvent(senderID,userModel, 'budget');
  //  } else {
  //    fsm.changeIncorrectEvent(senderID, 'budget');
  //  }   
  }
  else if (action.search("cpcAmountCorrect") !== -1) {
    var start = action.search("-")+1;
    var randomStr = action.slice(start);
    console.log('((((cpcAmountCorrect)))))) ', fsm.transitions());
  //  if (randomStr == sessionObj.randomStr) {
      fsm.changeConfirmedEvent(senderID,userModel, 'cpc');
  //  } else {
  //    fsm.changeIncorrectEvent(senderID, 'cpc');
  //  }
    
  }
  else if (action === 'budgetAmountNotCorrect') {
    fsm.changeIncorrectEvent(senderID, 'budget');
  }
  else if (action === 'cpcAmountNotCorrect') {
    fsm.changeIncorrectEvent(senderID, 'cpc');
  }
}

module.exports.receivedAccountLinking = function(event, userModel) {
  var senderID = event.sender.id;
  console.log('Recieved account_link event:  ', event);
  if (event.account_linking.status === "linked" && event.account_linking.authorization_code == process.env.AUTHORIZATION_CODE) {
    userModel.setUserProperties(senderID, [{authenticated: true}]).then(function(user) {
    console.log('*** ACCOUT IS LINKED!!!!');
    messages.sendTextMessage(senderID, "Success! You are now logged into your Outbrain account as " + user.name)
      .then(function() {
        fsm.selectAccountEvent(senderID, userModel);
      });
    });
  }  
  if (event.account_linking.status === "unlinked") {
    console.log('*** ACCOUT IS UNLINKED ****');
  } 
}


module.exports.containsNonLatinCodepoints = function(s) {
    return /[^\u0000-\u00ff]/.test(s);
}

function sendSelectCampaignMessage(senderID, account) {
 
}

function sendSelectDateRangeMessage(senderID) {
  var quick_replies =[{
      content_type:"text",
      title: "yesterday",
      payload: "dateSelect"
    },
    {
      content_type:"text",
      title: "last week",
      payload: "dateSelect"
    },
    {
      content_type:"text",
      title: "today",
      payload: "dateSelect"
    },
    {
      content_type:"text",
      title: "month to date",
      payload: "dateSelect"
    },
    {
      content_type:"text",
      title: "campaign to date",
      payload: "dateSelect"
    }];

        
  var message = "Select spend's date range:";
  sendQuickReplies(senderID, message, quick_replies);
}


function sendSelectReportSelectMessage(senderID) {
  var quick_replies =[
    {
      content_type:"text",
      title: "Overview",
      payload: "reportSelect"
    },
    {
      content_type:"text",
      title: "Trendline",
      payload: "reportSelect"
    }
  ];
  var message = "What do you want to check?";
  sendQuickReplies(senderID, message, quick_replies);
}

function sendOverviewReport(senderID) {
  var obToken = cache.get('obToken');
  var campaignObj = cache.get('campaignLookup');
  var campaignName = cache.get('campaign');
  var campaignId = campaignObj[campaignName];
  console.log('***&*&*&*&*&', campaignObj, campaignName, campaignId);
   var date = cache.get('date');
   var fromDate;
  switch(date) {
    case "yesterday":
      fromDate = moment().subtract(1, 'days');
      break;
    case "last week":
      fromDate = moment().subtract(7, 'days');
      break;
    case "today":
      fromDate = moment();
      break;
    case "month to date":
      fromDate = moment().subtract(30,'days');
      break;
    case "campaign to date":
      fromDate = moment().subtract(30,'days');
      break;
    //  fromDate = global.userFlowMap[message.from].campaigns[campaign_name].creationTime;
    default:
      fromDate = moment().subtract(1, 'days');
  }
  console.log('&&& date:   ', date, fromDate);
   var params = {from: fromDate.format('YYYY-MM-DD'), to: moment().format('YYYY-MM-DD')};
   return api.getPerformanceByDay(obToken, campaignId, params).then(function(data) {
      var messageText = "Here's summary for " + cache.get('campaign') + ":" +
        "\n cost: " + data.overallMetrics.cost + 
        "\n cpa: " + data.overallMetrics.cpa + 
        "\n ctr: " + data.overallMetrics.ctr + 
        "\n cpa: " + data.overallMetrics.cpa + 
        "\n clicks: " + data.overallMetrics.clicks + 
        "\n impressions: " + data.overallMetrics.impressions;
      sendTextMessage(senderID, messageText)
       .then(function() {
        chooseNextStep(senderID, 'overview');
      });  
   });
}

function chooseNextStep(senderID, currentAction) {
  var titles, payloads;
 
  if (currentAction === 'overview') {
    titles = ["Check Trendline", "Update budget"];
    payloads = ["showTrendline", "updateBudget"];
  } else if (currentAction === 'trendline') {
    titles = ["Check Overview", "Update budget"];
    payloads = ["showOverview", "updateBudget"];
  }

  var payload = {
    "template_type":"button",
    "text":"What do you want to do next?",
    "buttons":[
      {
        "type":"postback",
        "title": titles[0],
        "payload": payloads[0]
      },
      {
        "type":"postback",
        "title": titles[1],
        "payload": payloads[1]
      }
    ]
  };
  sendButtonMessage(senderID, payload);
}

function sendTrendlineReport(senderID) {
  var data = require('../data/weekly_performance.json');
  console.log('&&&&&&&', data.details);
  sendImageMessage(senderID, charts.getLineChart(data.details))
  .then(function() {
    chooseNextStep(senderID, 'trendline');
  });  
}



function accountSettings_action(senderID) {
  var elements = {   
      title: "Your Outbrain account settings", 
      image_url: "https://v.cdn.vine.co/v/avatars/ACDDB8BB-2FEB-4FBF-9BA3-BE0491ECC293-8626-00000757443D2912.jpg?versionId=FfPJrFoJlQsXqJZsYc3bPmdQDuq9i2lq",
      buttons: [
        {
          "type":"web_url",
          "url":"https://outbrain.com",
          "title":"Settings"
        },
      ]
    };
    if (cache.get('authenticated') === true) {
      elements.buttons.unshift({type: "account_unlink"});
    } else {
      elements.buttons.unshift({type: "account_link", url: process.env.APP_URL + "/authorize"});
    }
    sendGenericMessage(senderID, elements);

}



function getCampaignInformation(senderID, userModel) {
  return userModel.getBySenderID(senderID).then(function(user) {
  
    var obToken = user.obToken;
    var campaign = user.campaign;
    var campaignLookup = user.campaignLookup;
    var campaignId = campaignLookup[campaign];
    return api.getCampaign(obToken, campaignId).then(function(campaign) {
      
      return campaign;
    });
  });
}

module.exports.getCampaignInformation = getCampaignInformation;
 
module.exports.whatToDoNextMessage = function(senderID, userModel) {
  getCampaignInformation(senderID, userModel).then(function(campaignData) {
    var campaignAction = campaignData.enabled ? 'Stop Campaign' : 'Start Campaign';
    var elements = {   
      title: "What do you want to do next?",
      buttons: [{
        type: "postback",
        title: "Adjust Budget",
        payload: "adjustBudget"
      },
      {
        type: "postback",
        title: "Adjust CPCs",
        payload: "adjustcpc"
      },
      {
        type: "postback",
        title: campaignAction,
        payload: 'campaignStartStop'
      }]
    };
    var quick_replies = [
      {
        content_type:"text",
        title: "I'm Done",
        payload: "done"
      },
      {
        content_type:"text",
        title: "Overview",
        payload: "view"
      }
    ];
    messages.sendQuickReplies(senderID, elements, quick_replies);
  });
}
  // request(options)
  // .then(function(resp) {
  //   cache.put('obToken', resp);
  //   obToken = resp;
  //   console.log('(((&&&&&', resp);
  //   cache.put('authorization_code', 'ZWI3NDYyYjc1MjViNW5MTNiNWM4NQ0ZTViZTZ');
  //   var redirectPath = cache.get('redirect_uri')+ '&authorization_code='+cache.get('authorization_code');
  //   res.redirect(redirectPath);    
  // })
  // .catch(function(err) {
  //   res.sendFile(path.join(__dirname+'/templates/login_template_error.html'));
  // });



// curl -X POST -H "Content-Type: application/json" -d '{
//   "setting_type":"greeting",
//   "greeting":{
//     "text":"Need access to your Amplify dashboard from anywhere at any time? Here’s a new, quick and easy way to update your campaigns on the go! \r\n Click below to get started."
//   }
// }' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=EAAIP954xVOYBANLuF7I2BRcM1q1BGLFs7O8HMbXVJBIEK52ZBQ93RRz0rul4Mdo7FvS1O7RhkgO57LNxSJbprYYenUxIS0xhjmx5VzydZATK5ZATiZCJOv89vLQeIMaNwYoIz3XoGw15MHvrr1BKvkV6NCWOZBS6hpVefejniDgZDZD"        

// curl -X POST -H "Content-Type: application/json" -d '{
//   "setting_type":"call_to_actions",
//   "thread_state":"new_thread",
//   "call_to_actions":[
//     {
//       "payload":"get_started"
//     }
//   ]  
// }' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=EAAIP954xVOYBAPfYla8lhE4CDKRs6yIE54sdt9lZAtNPRZBqMAR6vOTDinb260VKdeLgGqgaAU5plndIxPdLmltiXaLnPOpsVRmZBrWJlTW6Qwkj4ZC589ZCGxnTnkelfO3DOB75RzDOGTMYNg6t1mcxzQ8MHG9Do1yQZBgY89GgZDZD"      

// curl -X POST -H "Content-Type: application/json" -d '{
//   "setting_type" : "call_to_actions",
//   "thread_state" : "existing_thread",
//   "call_to_actions":[
//     {
//       "type":"postback",
//       "title":"Account Settings",
//       "payload":"accountSettings"
//     },
//       {
//       "type":"web_url",
//       "title":"Help",
//       "url":"https://www.outbrain.com/"
//     },
//   ]
// }' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=EAAIP954xVOYBANLuF7I2BRcM1q1BGLFs7O8HMbXVJBIEK52ZBQ93RRz0rul4Mdo7FvS1O7RhkgO57LNxSJbprYYenUxIS0xhjmx5VzydZATK5ZATiZCJOv89vLQeIMaNwYoIz3XoGw15MHvrr1BKvkV6NCWOZBS6hpVefejniDgZDZD"

// curl -X POST -H "Content-Type: application/json" -d '{
//   "setting_type" : "domain_whitelisting",
//   "whitelisted_domains" : ["https://0ea578d1.ngrok.io/select-account"],
//   "domain_action_type": "add"
// }' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=EAAIP954xVOYBANLuF7I2BRcM1q1BGLFs7O8HMbXVJBIEK52ZBQ93RRz0rul4Mdo7FvS1O7RhkgO57LNxSJbprYYenUxIS0xhjmx5VzydZATK5ZATiZCJOv89vLQeIMaNwYoIz3XoGw15MHvrr1BKvkV6NCWOZBS6hpVefejniDgZDZD"


// curl -X POST -H "Content-Type: application/json" -d '{
//   "setting_type" : "domain_whitelisting",
//   "whitelisted_domains" : ["https://0ea578d1.ngrok.io/select-account"],
//   "domain_action_type": "add"
// }' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=EAAIP954xVOYBANLuF7I2BRcM1q1BGLFs7O8HMbXVJBIEK52ZBQ93RRz0rul4Mdo7FvS1O7RhkgO57LNxSJbprYYenUxIS0xhjmx5VzydZATK5ZATiZCJOv89vLQeIMaNwYoIz3XoGw15MHvrr1BKvkV6NCWOZBS6hpVefejniDgZDZD"

 //curl -X POST "https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=EAAIP954xVOYBANLuF7I2BRcM1q1BGLFs7O8HMbXVJBIEK52ZBQ93RRz0rul4Mdo7FvS1O7RhkgO57LNxSJbprYYenUxIS0xhjmx5VzydZATK5ZATiZCJOv89vLQeIMaNwYoIz3XoGw15MHvrr1BKvkV6NCWOZBS6hpVefejniDgZDZD"