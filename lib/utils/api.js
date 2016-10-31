var requestHelper = require('../utils/request');
var constants = require('../../constants');
var moment = require('moment');
/**
 * @function getInternalApiToken
 * @returns {object} Returns a promise.
 * @public
 */
module.exports.getInternalApiToken = function getInternalApiToken() {
  var authCode = new Buffer("amplifybot:" + process.env.DASHBOT_USER_PASSWORD).toString('base64');
  var options = {
    url: "http://amelia.outbrain.com/Amelia/api/internal/v2/login",
    headers: {
      'Authorization': 'Basic ' + authCode,
      'Content-Length':0
    }
  }; 
  return requestHelper(options);
};

/**
 * @function getUserId Gets a user id 
 * @returns {object} Returns a promise.
 * @public
 */
module.exports.getUserId = function getUserId(obToken, userName) {
  var options = {
    url: constants.AMPLIFY_INTERNAL_API_URL + `/users/name/${userName}`,
    headers: obToken
  };
  return requestHelper(options).then(function(resp) {
    if (!resp) {
      var options = {
        url: constants.AMPLIFY_INTERNAL_API_URL + `/users/${userName}`,
        headers: obToken
      };
      return requestHelper(options);
    }
    return resp;
  })
};
/**
 * @function Enable external user 
 * @returns {object} Returns a promise.
 * @public
 */
module.exports.enableUser = function enableUser(obToken, userId) {
  var options = {
    url: constants.AMPLIFY_INTERNAL_API_URL + `/users/${userId}/enable`,
    headers: obToken,
    method: 'PUT'
  }
  return requestHelper(options);
};

/**
 * @function getMarketers Gets a list of marketers
 * @returns {object} Returns a promise.
 * @public
 */
module.exports.getMarketers = function getMarketers(obToken) {
  var options = {
    url: constants.AMPLIFY_API_URL + '/marketers',
    headers: obToken
  };
  return requestHelper(options);
};

/**
 * @function getMarketers Gets a marketer
 * @returns {object} Returns a promise.
 * @public
 */
module.exports.getMarketer = function getMarketer(obToken, marketerId) {
  var options = {
    url: constants.AMPLIFY_API_URL + `/marketers/${marketerId}`,
    headers: obToken
  };
  return requestHelper(options);
};

/**
 * @function getMarketers Gets a list of marketers
 * @returns {object} Returns a promise.
 * @public
 */
module.exports.getAmplifyToken = function getAmplifyToken(userName, userPassword) {
  var authCode = new Buffer(userName +":" + userPassword).toString('base64');
  var options = {
    url: constants.AMPLIFY_API_URL + '/login',
    headers: {
      'Authorization': 'Basic ' + authCode,
      'Content-Length':0
    }
  }; 
  return requestHelper(options);
};


/**
 * @function getBudgets Gets a list of budgets
 * @param {string} marketerId The marketer ID to get budgets for
 * @returns {object} Returns a promise.
 * @public
 */
module.exports.getBudgets = function(marketerId) {
  return requestHelper({url: constants.AMPLIFY_API_URL + `/marketers/${marketerId}/budgets`});
};

/**
 * @function getCampaigns Gets a list of campaigns
 * @param {string} marketerId The marketer ID to get campaigns for
 * @param {boolean=} includeArchived Whether or not to return archived campaigns (default: false)
 * @param {string} fetch Indicates the size of the payload to return, can be either 'basic' or 'all' (default: 'all') 
 * @returns {object} Returns a promise.
 * @public
 */
module.exports.getCampaigns = function(obToken, marketerId, includeArchived, fetch) {
  includeArchived = includeArchived || false;
  fetch = fetch || 'all';
  var options = {
    url: constants.AMPLIFY_API_URL + `/marketers/${marketerId}/campaigns`,
    qs: {includeArchived, fetch},
    headers: obToken
  };
  return requestHelper(options);
};

/**
 * @function getCampaign Gets a one of campaign
 * @param {string} marketerId The marketer ID to get campaigns for
 * @param {boolean=} includeArchived Whether or not to return archived campaigns (default: false)
 * @param {string} fetch Indicates the size of the payload to return, can be either 'basic' or 'all' (default: 'all') 
 * @returns {object} Returns a promise.
 * @public
 */
module.exports.getCampaign = function(obToken, campaignId) {
  var options = {
    url: constants.AMPLIFY_API_URL + `/campaigns/${campaignId}`,
    headers: obToken
  };
  return requestHelper(options);
};

/**
 * @function getPerformanceByDay
 * @param {string} campaignId The campaign ID to get performance metrics for
 * @param {object} params
 * @param {string} params.from The start date (format: YYYY-MM-DD)
 * @param {string} params.to The end date (format: YYYY-MM-DD)
 * @param {number=} params.limit The number of results to return (default: 10)
 * @param {string=} params.sort 'ctr', 'impressions', 'cost', 'clicks', 'date', prepended with a '+' (descending) or a '-' (ascending) (default: '+date')
 * @returns {object} Returns a promise.
 * @public
 */
module.exports.getPerformanceByDay = function getPerformanceByDay(obToken, campaignId, params) {
  params.limit = params.limit || 10;
  params.sort = params.sort || '+date';
  var options = {
    url: constants.AMPLIFY_API_URL + `/campaigns/${campaignId}/performanceByDay`,
    qs: params,
    headers: obToken
  };
  return requestHelper(options);
};

/**
 * @function updateBudget Update an existing budget
 * @param {string} budgetId The budget ID to update
 */
module.exports.updateBudget = function updateBudget(obToken, budgetId, amount) {
  const endDate = moment().add(1, 'days').format('YYYY-MM-DD');
  var options = {
    url: constants.AMPLIFY_API_URL + `/budgets/${budgetId}`,
    method: 'PUT',
    headers: Object.assign(obToken, {'Content-Type': 'application/json'}),
    headers: obToken,
    json: {amount, endDate}
  }
  return requestHelper(options);
};

/**
 * @function updateBudget Update an existing budget
 * @param {string} budgetId The budget ID to update
 */
module.exports.updateCampaign = function updateCampaign(obToken, campaignId, property, value) {
  var obj = {
    cpc: {"cpc" : value},
    budget: {"budget" : value},
    enabled: {"enabled" : value}
  };
  var options = {
    url: constants.AMPLIFY_API_URL + `/campaigns/${campaignId}`,
    method: 'PUT',
    headers: Object.assign(obToken, {'Content-Type': 'application/json'}),
    headers: obToken,
    json: obj[property] 
  }
  return requestHelper(options);
};
