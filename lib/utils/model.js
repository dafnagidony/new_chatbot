var nohm = require('nohm').Nohm;

/**
 * @class UserModel
 * @desc UserModel Nohm constructor
 */
module.exports = nohm.model('User', {
  properties: {
    created_on: {
      type: 'string'
    },
    senderID: {
      type: 'string',
      unique: true
    },
    name: {
      type: 'string',
      index: true
    },
    facebook_name: {
      type: 'string'
    },
    email: {
      type: 'string',
      index: true
    },
    authenticated: {
      type: 'boolean'
    },
    obToken: {
      type: 'json'
    },
    account: {
      type: 'string'
    },
    campaign: {
      type: 'string'
    },
    accountLookup: {
      type: 'json'
    },
    campaignLookup: {
      type: 'json'
    },
    updatedBudget: {
      type: 'string'
    },
    updatedCpc: {
      type: 'string'
    },
    currentState: {
      type: 'string'
    }
  },
  methods: {
    getSnapshot: function() {
      var snapshot = {};
      var prop;
      // iterate over props
      for (prop in this.properties) {
        // parse json string if needed
        if (this.properties[prop].type === 'json') {
          this.properties[prop].value = JSON.parse(this.properties[prop].value);
        }
        snapshot[prop] = this.properties[prop].value;
      }
      return snapshot;
    }
  }
});
