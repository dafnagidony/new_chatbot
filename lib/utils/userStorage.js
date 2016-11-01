var ENV = process.env;
//var config = require('../config');
var crypto = require('crypto');
var bcrypt = require('bcrypt');
var model = require('./model');
var Nohm = require('nohm').Nohm;
var utils = require('obil-utils');
var debug = utils.core.debug('obil:user');
var request = utils.core.request;

/**
 * @class User
 * @desc  User class constructor
 */
function User() {
  var _model = null;
  var _store = null;

  Object.defineProperties(this, {
    model: {
      get: function() {
        return _model;
      },
      set: function(state) {
        _model = state;
      }
    },
    store: {
      get: function() {
        return _store;
      },
      set: function(state) {
        _store = state;
      }
    }
  });
}


/**
 * @function init
 * @desc Initialize store & set model
 * @param {Object} options Options
 * @param {Object} options.store Store
 * @return {Object} promise Promise
 */
User.prototype.init = function init(options) {
  const self = this;
  const opts = options || {};

  function createUserModel(store) {
    Nohm.setPrefix('dashbot:user:' + (ENV.NODE_ENV || 'development'));
    console.log('model created');
    Nohm.setClient(store.client);
    self.model = model;
    self.store = store;
  }

  return utils.core.promise(function initUser(resolve, reject) {
    if (opts.store) {
      createUserModel(opts.store);
      return resolve(self);
    }

    debug.warn('Store will be required in next version of user service. You should pass in options.store object');
    return utils.store.connectToStore().then(function promisedStore(store) {
      createUserModel(store);
      return resolve(self);
    }).catch(function(err) {
      return reject(err);
    });
  });
};


/**
 * @function close
 * @desc Close connection to store and terminate process
 */
User.prototype.close = function close() {
  const self = this;

  return utils.core.promise(function closeUserStore(resolve, reject) {
    self.store.close().then(function() {
      debug('disconnected from store');
      return resolve(self);
    }).catch(function(err) {
      return reject(err);
    });
  });
};


/**
 * @function add
 * @param {Object} user User
 * @returns {Object} Promise fulfilled with user (nohm) object
 * @desc Add user to store
 */
User.prototype.add = function add(user) {
  var self = this;

  return utils.core.promise(function(resolve, reject) {
    var _upsert = function(factory) {
      self.upsert(user, factory)
        .then(function() {
          self.getBySenderID(user.senderID).then(function(userProperties) {
            return resolve(userProperties);
          });
        })
        .catch(function(err) {
          return reject(err);
        });
    };
    self.getBySenderID(user.senderID)
      .then(function(userFromStore) {

        var factory = Nohm.factory('User');
        if (!userFromStore) {
          return _upsert(factory);
        }
        return self.model.find({
          senderID: user.senderID
        }, function(err, ids) {
          if (err) {
            return reject(err);
          }
          return factory.load(ids[0], function() {
            return _upsert(factory);
          });
        });
      })
      .catch(function(err) {
        return reject(err);
      });
  });
};


/**
 * @function upsert
 * @param {Object} user User
 * @param {String} id Store Id
 * @returns {Object} Promise fulfilled with user (nohm) object
 * @desc Add or update user in store
 */
User.prototype.upsert = function upsert(user, factory) {
  return utils.core.promise(function(resolve, reject) {
    factory.p({
      created_on: user.created_on || '',
      senderID: user.senderID || '',
      facebook_name: user.facebook_name || '',
      authenticated: user.authenticated || 'false'
    });

    factory.save(function(err) {
       console.log('****** err:', err);
      if (err) {
        return reject(err);
      }
      return resolve(factory);
    });
  });
};


/**
 * @function getByProperty
 * @param {Object} prop Key:value object
 * @returns {Object} Promise fulfilled with user object
 * @desc Retrieve user from store using user name
 */
User.prototype.getByProperty = function getByProperty(prop) {
  var self = this;
  return utils.core.promise(function(resolve, reject) {
    self.model.find(prop, function(err, ids) {
      if (err) {
        return reject(err);
      }
      if (ids && ids.length) {
        return self.getById(ids[0]).then(function(userProperties) {
          return resolve(userProperties);
        }).catch(function() {
          return resolve(null);
        });
      }
      return resolve(null);
    });
  });
};


/**
 * @function getByName
 * @param {String} name User name
 * @returns {Object} Promise fulfilled with user object
 * @desc Retrieve user from store using user name
 */
User.prototype.getByName = function getByName(name) {
  var self = this;
  if (!name || (typeof name !== 'string')) {
    throw new TypeError('User.getByName requires string (name) argument');
  }
  return self.getByProperty({
    name: name
  });
};


/**
 * @function getByEmail
 * @param {String} email User email
 * @returns {Object} Promise fulfilled with user object
 * @desc Retrieve user from store using user email
 */
User.prototype.getByEmail = function getByEmail(email) {
  var self = this;
  if (typeof email !== 'string') {
    throw new TypeError('User.getByEmail requires string (email) argument');
  }
  return self.getByProperty({
    email: email
  });
};

/**
 * @function getByEmail
 * @param {String} email User email
 * @returns {Object} Promise fulfilled with user object
 * @desc Retrieve user from store using user email
 */
User.prototype.getBySenderID = function getBySenderID(senderID) {
  var self = this;
  if (typeof senderID !== 'string') {
    throw new TypeError('User.getBySenderID requires string (senderID) argument');
  }
  return self.getByProperty({
    senderID: senderID
  });
};

/**
 * @function getIds
 * @returns {Object} Promise fulfilled with ids of all stored objects
 * @desc Retrieve all objects ids
 */
User.prototype.getIds = function getIds() {
  var self = this;
  return utils.core.promise(function(resolve, reject) {
    self.model.find(function(err, ids) {
      if (err) {
        return reject(err);
      }
      return resolve(ids);
    });
  });
};


/**
 * @function getById
 * @param {String} id Store id
 * @returns {Object} Promise fulfilled with user (nohm) object
 * @desc Retrieve all objects ids
 */
User.prototype.getById = function getById(id) {
  var self = this;
  return utils.core.promise(function(resolve, reject) {
    self.model.load(id, function(err, user) {
      if (err) {
        return reject(err);
      }
      return resolve(user);
    });
  });
};


User.prototype.setUserProperties = function(senderID, props) {
  var self = this;

  return utils.core.promise(function(resolve, reject) {
    var factory = Nohm.factory('User');
    self.model.find({
      senderID: senderID
    }, function(err, ids) {
      if (err) {
        return reject(err);
      }
      return factory.load(ids[0], function() {
        props.forEach(function(prop) {
          factory.p(prop);
        });
        factory.save(function(err2) {
          if (err2) {
            return reject(err2);
          }
          return self.getBySenderID(senderID).then(function(userProperties) {
            return resolve(userProperties);
          });
        });
      });
    });
  });
};



/**
 * @function getUserStoredByEmail
 * @param {String} email
 * @returns {Object} Promise fulfilled with User object
 */
User.prototype.getUserStoredByEmail = function getUserStoredByEmail(email) {
  var uriParts = [config.vr_config_endpoint, 'users', email];
  return utils.core.promise(function(resolve, reject) {
    request({
      uri: uriParts.join('/'),
      json: true
    }).then(function(resp) {
      return resolve(resp);
    })
      .catch(function(err) {
        return reject(err);
      });
  });
};


/**
 * @function setUserStoredPassword
 * @param {String} email
 * @param {String} password
 * @returns {Object} Promise fulfilled with User object
 */
User.prototype.setUserStoredPassword = function setUserStoredPassword(user, password) {
  var self = this;
  var uriParts = [config.vr_config_endpoint, 'publishers', user.publisher_id, 'users', user.user];

  return utils.core.promise(function(resolve, reject) {
    bcrypt.genSalt(10, function(err, salt) {
      if (err) {
        return reject(err);
      }
      return bcrypt.hash(password, salt, function(error, hash) {
        if (error) {
          return reject(error);
        }
        user.salty_passwd = hash;
        // updating user store
        return request({
          method: 'PUT',
          uri: uriParts.join('/'),
          body: user,
          json: true
        }).then(function(resp) {
          // updating cache
          resp.name = resp.user; // unifying user -> name
          self.add(resp).then(function(savedUser) {
            return resolve(savedUser);
          });
        }).catch(function(errr) {
          return reject(errr);
        });
      });
    });
  });
};

/**
 * @function setUserStoredPassword
 * @param {String} email
 * @param {String} password
 * @returns {Object} Promise fulfilled with User object
 */
User.prototype.setUserStoredPassword = function setUserStoredPassword(senderID, password) {
  var self = this;
  
  return utils.core.promise(function(resolve, reject) {
    bcrypt.genSalt(10, function(err, salt) {
      if (err) {
        return reject(err);
      }
      return bcrypt.hash(password, salt, function(error, hash) {
        if (error) {
          return reject(error);
        }

        self.setUserProperties(senderID, [{salty_password: hash}]).then(function(savedUser) {
          return resolve(savedUser);
        })
        .catch(function(err) {
          return reject(err);
        });
      });
    });
  });
};

/**
 * @function init
 * @returns {Object} Instance of User class
 * @desc Initialize User
 */
User.init = function(options) {
  return (new User()).init(options);
};

module.exports = User;
