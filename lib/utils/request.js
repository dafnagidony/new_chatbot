var request = require('request-promise');
var merge = require('lodash.merge');

module.exports = function(optionsInput) {
	options = merge({}, {json: true}, optionsInput);
  return request(options);
};
