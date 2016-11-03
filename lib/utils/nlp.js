var pluralize = require('pluralize');
var fsm = require('./fsm');
messages = require('./messages');

var dictionary= {
	action: {
	"modify": editAction,
	"update": editAction,
	"change": editAction,
	"configure": editAction,
	"set": editAction,
	"edit": editAction,
	"show": showAction,
	"display": showAction,
	"view": showAction,
  "another": showAction,
  "select": showAction,
  "other": showAction,
	"help": helpAction,
	"switch": selectAction,
	"select": selectAction,
	"move": selectAction,
	"start": startAction,
	"stop": stopAction,
	"run": startAction,
	"play": startAction,
	"pause": stopAction
	},
  subject: [
    "campaign",
    "settings",
    "account",
    "budget",
    "cpc",
    "report",
    "overview",
    "trendline"
  ]
};

function editAction() {

}

function showAction(subj) {
  console.log('-------', subj);
}

function selectAction(subj, senderID, userModel) {
  userModel.getBySenderID(senderID).then(function(user) {
    var account = user.account;
    var campaign = user.campaign;
    console.log('+++@@@@@', subj, account, campaign, fsm.current, fsm.transitions());
    if ((subj == 'account' && account) || (!subj && account && !campaign)) {
      fsm.selectAccountEvent(senderID, userModel);
    } else if (!subj && account && campaign) {
      var message =  "You are now in account: " + account + ", Campaign: " + campaign + ". What would you like to switch? Pick an option below.";
      var quick_replies = [
        {
          content_type:"text",
          title: 'Account',
          payload: "switchAccount"
        },
         {
          content_type:"text",
          title: 'Campaign',
          payload: "switchCampaign"
        }
      ];
      messages.sendQuickRepliesWithMessage(senderID, message, quick_replies);
    } else if (subj == 'campaign' && campaign) {
      fsm.selectCampaignEvent(senderID, userModel);
    } else {
      messages.sendTextMessage(senderID, "Invalid Action, please try again.").then(function() {
        var transitions = fsm.transitions();
        console.log('------ transition ', transitions[0]);
        if(transitions.length) {
          var func = fsm[transitions[0]];
          func(senderID, account);
        } else {

        }
      });
    }
  });

}
function startAction() {

}

function stopAction() {

}

function helpAction() {

}

function findAction(arr) {
  for(var i = 0; i < arr.length; i++) {
    for (var key in dictionary.action) {
      if (key === arr[i]) {
        arr.splice(i, 1);
        return dictionary.action[key];
      }
    }
  }
  return;
}

function findInSubject(arr) {
  for(var i = 0; i < arr.length; i++) {
    if (dictionary.subject.indexOf(arr[i]) !== -1) {
      var subj = arr[i];
      arr.splice(i, 1);
      return subj;
    }
  }
  return;
}

module.exports.nlpResponse = function nlpResponse(str, senderID, userModel) {

  var str_arr = str.toLowerCase().split(" ");
  str_arr.forEach(function(element, index, array) {
    array[index] = pluralize(element, 1);
  });
  var action = findAction(str_arr);
  var subject = findInSubject(str_arr);
  if (action) {
    action(subject, senderID, userModel);
  } else {
    messages.sendTextMessage(senderID, "Invalid Action, please try again.")
  }
  
}





