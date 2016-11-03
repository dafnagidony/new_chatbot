fsm = require('javascript-state-machine');
messages = require('./messages');
var request = require('request-promise');
var cache = require('memory-cache');
var randomstring = require("randomstring");
var api = require('./api');
var utils = require('./index');

var fsm = fsm.StateMachine.create({
	initial: { state: 'getStarted', event: 'init', defer: true },
  events: [
    {name: 'login', from: 'getStarted', to: 'login'},
    {name: 'selectAccountEvent', from: '*', to: 'selectAccount'},
    {name: 'selectCampaignEvent', from: '*', to: 'selectCampaign'},
    {name: 'chosenEvent', from: ['selectAccount', 'selectCampaign'], to: 'chosen'}, // add chesen for nlp
    {name: 'confirmedEvent', from: 'chosen', to: 'confirmed'},
    {name: 'manageEvent', from: 'confirmed', to: 'manageCampaign'},
    {name: 'viewEvent', from: 'confirmed', to: 'viewCampaign'},
    {name: 'adjustBudgetEvent', from: ['manageCampaign', 'changeConfirmed', 'changeIncorrect', 'turnOnOff'], to: 'adjustBudget'},
    {name: 'adjustCpcEvent', from: ['manageCampaign', 'changeConfirmed', 'changeIncorrect', 'turnOnOff'], to: 'adjustCpc'},
    {name: 'turnOnOffEvent', from: ['turnOnOff', 'manageCampaign', 'changeConfirmed', 'changeIncorrect'], to: 'turnOnOff'},
    {name: 'amountEnteredEvent', from: ['adjustBudget', 'adjustCpc'], to: 'amountEntered'},
    {name: 'changeConfirmedEvent', from: 'amountEntered', to: 'changeConfirmed'},
    {name: 'changeIncorrectEvent', from: ['amountEntered', 'changeConfirmed'], to: 'changeIncorrect'},
    {name: 'dateRangeEvent', from: 'viewCampaign', to: 'dateRange'},
    {name: 'overviewEvent', from: 'dateRange', to: 'overview'},
    {name: 'trendlineEvent', from: 'dateRange', to: 'trendline'},
    {name: 'dateRangeEvent', from: 'dateRange', to: 'dateRange'},
    {name: 'doneEvent', from: ['overview', 'trendline', 'adjustBudget', 'adjustCpc', 'turnOnOff'], to: 'done'},
    {name: 'exitEvent', from: 'done', to: 'exit'}
],
callbacks: {
    ongetStarted: function(event, from, to, senderID, userModel) {  	
		  request({url: 'https://graph.facebook.com/v2.6/'+senderID+'?access_token='+process.env.PAGE_ACCESS_TOKEN, json:true})
		  .then(function(resp) { 
        userModel.getBySenderID(senderID).then(function(user) {
          console.log('%%%%%%%((((((())))))))', user);
          if (!user) {
            var userProp = {
              created_on: new Date().toISOString(),
              senderID: senderID,
              facebook_name: resp.first_name,
              authenticated: false
            };
            userModel.add(userProp).then(function(user) {
              console.log('-----********---- user created:', user);
              fsm.login(senderID, resp.first_name);
            });
          }
          else {
            if (user.authenticated && user.name !== '') {
              var elements = {   
                title: "Welcome back " + resp.first_name + "!",  
                image_url: "https://v.cdn.vine.co/v/avatars/ACDDB8BB-2FEB-4FBF-9BA3-BE0491ECC293-8626-00000757443D2912.jpg?versionId=FfPJrFoJlQsXqJZsYc3bPmdQDuq9i2lq"
              };
              messages.sendGenericMessage(senderID, elements)
                .then(function() {
                  fsm.selectAccountEvent(senderID, userModel);
                }); 
            } else {
              fsm.login(senderID, resp.first_name);
            }
          }
        });       
		  });               
 		},
 		onlogin: function(event, from, to, senderID, name) {
	   	var elements = {   
		    title: "Hi " + name + ",",
		    subtitle: "Welcome to Dashbot by Outbrain. Login to your Amplify Account.",
		    image_url: "https://v.cdn.vine.co/v/avatars/ACDDB8BB-2FEB-4FBF-9BA3-BE0491ECC293-8626-00000757443D2912.jpg?versionId=FfPJrFoJlQsXqJZsYc3bPmdQDuq9i2lq",
		    buttons: [{
		      type: "account_link",
		      url: process.env.APP_URL + "/authorize"
		    }]
		  };
	  	messages.sendGenericMessage(senderID, elements);
 		},
    onselectAccount: function(event, from, to, senderID, userModel) {
      userModel.getBySenderID(senderID).then(function(user) {
        var obToken = user.obToken;
        api.getMarketers(obToken).then(function(marketers) {
          var recentAccounts = cache.get('mostUsedAccounts');
          var quick_replies = [];
          var accountObj = {};
          for (var i = 0; i< marketers.count; i++) {
            accountObj[marketers.marketers[i].name] = marketers.marketers[i].id;
            if (!recentAccounts && i < 3) {
              var reply = {
                content_type:"text",
                title: marketers.marketers[i].name.slice(0,20),
                payload: "accountSelect-" + marketers.marketers[i].name
              };
              quick_replies.push(reply);
            }
          }
          userModel.setUserProperties(senderID, [{accountLookup: accountObj}]);
          if (recentAccounts) {
            for (var i=0; i < recentAccounts.length; i++) {
              var reply = {
                content_type:"text",
                title: recentAccounts[i].slice(0,20),
                payload: "accountSelect-" + recentAccounts[i]
              };
              quick_replies.push(reply);
            }
          }

    	    var message = "Pleae select an Account name or type the name, or portion of the name, below to search for it.";
    	    messages.sendTextMessage(senderID, message).then(function() {
    	    	var elements = {   
        		  title: marketers.count + " Accounts",
        		  buttons: [{
        		    type: "web_url",
        		    url: process.env.APP_URL + "/select-account",
        		    title: "View List of Accounts",
        		    webview_height_ratio: "compact",
        		    messenger_extensions: true
        		  }]
        		};
            messages.sendQuickReplies(senderID, elements, quick_replies);
    	    })
    	  });  
      });         
    },
    onchosen: function(event, from, to, senderID, name) {
      var elements = {   
        title: "You've selected " + name + ". Is this correct?",
        buttons: [{
          type: "postback",
          title: "Yes"
        },
        {
          type: "postback",
          title: "No"
        }]
      };
      if (from == "selectAccount") {
        elements.buttons[0].payload = "accountIsCorrect";
        elements.buttons[1].payload = "accountNotCorrect";
      }
      else {
        elements.buttons[0].payload = "campaignIsCorrect";
        elements.buttons[1].payload = "campaignNotCorrect";
      }
      messages.sendGenericMessage(senderID, elements);
    },
    onconfirmed: function(event, from, to, senderID, action, userModel) {
      userModel.getBySenderID(senderID).then(function(user) {
        var campaign = user.campaign;
        var account = user.account;
        console.log('--------------------- from confirmed: ', senderID, campaign, account, action);
        var elements = {   
          buttons: [{
            type: "web_url",
            webview_height_ratio: "full",
            messenger_extensions: true
          }]
        };
        var quick_replies = [
            {
              content_type:"text",
              title: 'Switch Account',
              payload: "switchAccount"
            },
            {
              content_type:"text",
              title: 'Choose Campaign',
              payload: "chooseCampaign"
            }
          ];
        if (action == 'account') {
          var message = "Great. Please choose an option below.";
          elements.title = account;
          elements.buttons[0].title = "View Account Summary";  
          elements.buttons[0].url = process.env.APP_URL + "/account-summary";      
        } else {
          var message = "Great. You've accessed " + campaign + " in " + account + ". What whould you like to do next?";
          elements.title = campaign;
          elements.buttons[0].title = "View Campaign Summary";
          elements.buttons[0].url = process.env.APP_URL + "/campaign-summary";   
          quick_replies[1].title = 'Switch Campaign'
          var replies = [
            {
              content_type:"text",
              title: 'Manage',
              payload: "manage"
            },
            {
              content_type:"text",
              title: 'View',
              payload: "view"
            }
          ];
        quick_replies = replies.concat(quick_replies); 
        }
        messages.sendTextMessage(senderID, message).then(function() {
          messages.sendQuickReplies(senderID, elements, quick_replies);
        })
      });
    },
    onselectCampaign: function(event, from, to, senderID, userModel) {
      userModel.getBySenderID(senderID).then(function(user) {
        var obToken = user.obToken;
  		  var accountObj = user.accountLookup;
        var account = user.account;
  		  var marketerId = accountObj[account];
  		  api.getCampaigns(obToken, marketerId).then(function(campaigns) {
          var recentCampaigns = cache.get('mostUsedCampaigns');
  		    var quick_replies = [];
  		    var campaignObj = {};
  		    for (var i = 0; i< campaigns.count; i++) {
  		      var campaignName = campaigns.campaigns[i].name;
  		      if (!utils.containsNonLatinCodepoints(campaignName)) {
  		        campaignObj[campaignName] = campaigns.campaigns[i].id;
              if (!recentCampaigns && i < 3) {
                var reply = {
                  content_type:"text",
                  title: campaigns.campaigns[i].name.slice(0,20),
                  payload: "campaignSelect-" + campaigns.campaigns[i].name
                };
                quick_replies.push(reply);
              }  
  		      }
            userModel.setUserProperties(senderID, [{campaignLookup: campaignObj}]);
            if (recentCampaigns) {
              for (var i=0; i < recentCampaigns.length; i++) {
                var reply = {
                  content_type:"text",
                  title: recentCampaigns[i].slice(0,20),
                  payload: "campaignSelect-" + recentCampaigns[i]
                };
                quick_replies.push(reply);
              }
            }
  		    }	    
  	      var message = "Pleae select the Campaign name or type the name, or portion of the name, below to search for it.";
          messages.sendTextMessage(senderID, message).then(function() {
            var elements = {   
              title: campaigns.count + " Campaigns",
              buttons: [{
                type: "web_url",
                url: process.env.APP_URL + "/select-campaign",
                title: "View List of Campaigns",
                webview_height_ratio: "compact",
                messenger_extensions: true
              }]
            };
            messages.sendQuickReplies(senderID, elements, quick_replies);
          })
  		  });
      });  
    },
    onmanageCampaign: function(event, from, to, senderID, userModel) { 
      utils.getCampaignInformation(senderID, userModel).then(function(campaignData) {
        var campaignAction = campaignData.enabled ? 'Stop Campaign' : 'Start Campaign';
        var elements = {   
          title: 'If you want to view the campaign data at anytime, type "view". What do you want to do to ' + campaignData.name +'?',
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
        messages.sendGenericMessage(senderID, elements);
      });
    },
    onviewCampaign: function(event, from, to, senderID, userModel) {
      var quick_replies = [
          {
            content_type:"text",
            title: 'Today',
            payload: "dateRange"
          },
          {
            content_type:"text",
            title: 'Yesterday',
            payload: "dateRange"
          },
          {
            content_type:"text",
            title: 'This Week',
            payload: "dateRange"
          },
          {
            content_type:"text",
            title: 'Last Week',
            payload: "dateRange"
          },
          {
            content_type:"text",
            title: 'Month to Date',
            payload: "dateRange"
          },
          {
            content_type:"text",
            title: 'Last 30 Days',
            payload: "dateRange"
          },
          {
            content_type:"text",
            title: 'Campaign to Date',
            payload: "dateRange"
          }
        ];
      var message = 'If you want to manage the campaign at anytime, type "manage". Select a date range you want to view:';
      messages.sendQuickRepliesWithMessage(senderID, message, quick_replies);
    },
    onadjustCpc: function(event, from, to, senderID, userModel) {
      utils.getCampaignInformation(senderID, userModel).then(function(campaignData) {
        var cpc =  campaignData.cpc;
        var currency = campaignData.currency;
        var message = "Currently the CPC is set to " + cpc + " " + currency + ". Enter the amount you want to change it to."
        messages.sendTextMessage(senderID, message);
      });
    },
    onadjustBudget: function(event, from, to, senderID, userModel) {
      console.log('---------------- from adjustBudget');
      utils.getCampaignInformation(senderID, userModel).then(function(campaignData) {
        var budget =  campaignData.budget.amount;
        var currency = campaignData.budget.currency;
        console.log('---------------- from adjustBudget', budget, currency);
        var message = "Currently the Budget is set to " + budget + " " + currency + ". Enter the amount you want to change it to."
        messages.sendTextMessage(senderID, message);
      });
    },
    onturnOnOffEvent: function(event, from, to, senderID, userModel) {
      console.log('---------------- from onturnOnOffEvent');
      utils.getCampaignInformation(senderID, userModel).then(function(campaignData) {
        var action = !campaignData.enabled;
        var actionStr = action ? 'on' : 'off';
        userModel.getBySenderID(senderID).then(function(user) {
          var obToken = user.obToken;
          api.updateCampaign(obToken, campaignData.id, 'enabled', action)
          .then(function() {
            var message = "Success! You've turned " + actionStr + " the campaign.";
            console.log('---------------- from onturnOnOffEvent', action, campaignData.id);
            messages.sendTextMessage(senderID, message).then(function() {
              utils.whatToDoNextMessage(senderID, userModel);
            });
          })
          .catch(function(err) {
            fsm.changeIncorrectEvent(senderID, 'cpc');
          });
        });
      })
      .catch(function(err) {
        console.log('{{{{ onturnOnOffEvent }}}}}', err);
      });
    },
    onamountEntered: function(event, from, to, senderID, amount, userModel) {
      var action = (from == "adjustBudget") ? "Budget" : "CPC";
      utils.getCampaignInformation(senderID, userModel).then(function(campaignData) {
        var originalValue = (from == "adjustBudget")? campaignData.budget.amount : campaignData.cpc;
        var randomStr = randomstring.generate(8);
      //  sessionObj.randomStr = randomStr;
        var elements = {   
          title: "You've updated your " + action + " from " + originalValue + " to " + amount + ". is this  correct?",
          buttons: [{
            type: "postback",
            title: "Yes"
          },
          {
            type: "postback",
            title: "No"
          }]
        };
        if (action == "Budget") {
          elements.buttons[0].payload = "budgetAmountCorrect-" + randomStr;
          elements.buttons[1].payload = "budgetAmountNotCorrect";
          userModel.setUserProperties(senderID, [{updatedBudget: amount}]);
        } else {
          elements.buttons[0].payload = "cpcAmountCorrect-" + randomStr;
          elements.buttons[1].payload = "cpcAmountNotCorrect";
          userModel.setUserProperties(senderID, [{updatedCpc: amount}]);
        }
        messages.sendGenericMessage(senderID, elements);
      });
    },
    onchangeConfirmed: function(event, from, to, senderID, userModel, action) {
      console.log('======== from onchangeConfirmed');
      userModel.getBySenderID(senderID).then(function(user) {
        var obToken = user.obToken;
        utils.getCampaignInformation(senderID, userModel).then(function(campaignData) {
          var budgetId = campaignData.budget.id;
          if (action == 'budget') {
            var amount = user.updatedBudget;
            api.updateBudget(obToken, budgetId, amount)
            .then(function() {
              var message = "Success! Your Budget is now " + amount + "."
              messages.sendTextMessage(senderID, message).then(function() {
                utils.whatToDoNextMessage(senderID, userModel);
              });
            })
            .catch(function(err) {
              fsm.changeIncorrectEvent(senderID, 'budget');
            });
          } else { 
            var amount = user.updatedCpc;
            api.updateCampaign(obToken, campaignData.id, 'cpc', amount)
            .then(function() {
              var message = "Success! Your CPC is now " + amount + "."
              messages.sendTextMessage(senderID, message).then(function() {
                utils.whatToDoNextMessage(senderID, userModel);
              });
            })
            .catch(function(err) {
              console.log('(( cant update cpc))', err);
              fsm.changeIncorrectEvent(senderID, 'cpc');
            });
          }
        });
      });
    },
    onchangeIncorrect: function(event, from, to, senderID, action) {
      console.log('%%%%----- from change Incorrect', from, action);
      messages.sendTextMessage(senderID, "Whoops. Let's try again.").then(function() {
        if (action == 'budget') {
          fsm.adjustBudgetEvent(senderID);
        } else if (action == 'cpc') {
          fsm.adjustCpcEvent(senderID);
        }    
      });
    }
  }
});

module.exports = fsm;
