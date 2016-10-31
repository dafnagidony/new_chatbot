var request = require('request-promise');

module.exports.sendImageMessage = function(recipientId, url) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      attachment:{
        type: "image",
        payload:{
          url: url
        }
      }
    }
  };

  return callSendAPI(messageData);
}


module.exports.sendTextMessage = function(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  return callSendAPI(messageData);
}

module.exports.sendButtonMessage = function(recipientId, payload) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: payload
      }
    }
  };
  return callSendAPI(messageData);
}


module.exports.sendGenericMessage = function(recipientId, elements) {
   var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [elements]
        }
      }
    }
  };
  return callSendAPI(messageData);
}

module.exports.sendQuickReplies = function(recipientId, elements, quick_replies) {
   var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [elements]
        }
      },
      quick_replies: quick_replies
    }
  };
  return callSendAPI(messageData);
}

module.exports.sendQuickRepliesWithMessage = function(recipientId, message, quick_replies) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      text: message,
      quick_replies: quick_replies
    }
  };
  return callSendAPI(messageData);
}

function callSendAPI(messageData) {
  return request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    body: messageData,
    json: true
  })
  .then(function(resp) {
   console.log("Successfully sent generic message", messageData);
   return Promise.resolve();
  })
  .catch(function(err) {
    console.log("ERROR sent generic message", err);
    return Promise.reject('error');
  });
}