var Server = require('obil-server');
var url = require('url');
var config = require('../config');
var obilUser = require('./utils/userStorage'); //require('obil-user');
var pkg = require('../package');
var plugins = require('./plugins');
var routes = require('./routes');
var utils = Server.utils;
var debug = Server.utils.core.debug('obil:auth-service');
var helpers = utils.helpers;
var logger = utils.logger;


/**
 * DashbotService
 * @class DashbotService(options)
 * @param {Object} options
 * @param {Object} options.app App configuration
 * @param {Array} options.app.routes An array of route objects, i.e. { method:'GET', path: '/hello', handler: function(req, res) { res.send('world!'); } }
 * @param {Array} options.app.plugins An array of express-middleware plugins
 * @returns {Object} Instance of auth service
 */
function DashbotService(options) {
  var _started = false;
  var _server = new Server(options);

  Object.defineProperties(this, {
    started: {
      enumerable: true,
      get: function() {
        return _started;
      },
      set: function(state) {
        _started = state;
      }
    },
    server: {
      enumerable: true,
      get: function() {
        return _server;
      },
      set: function(server) {
        _server = server;
      }
    }
  });
}


/**
 * Exposed start method
 * @return {object} returns a promise with the instance of auth service
 */
DashbotService.prototype.start = function() {
  var self = this;
  var userStore;

  return utils.core.promise(function(resolve, reject) {
    if (self.started) {
      return reject(new Error('The server is already running'));
    }

    return self.server.start().then(function(serv) {
    	debug.info('SERVER:', serv);

      userStore = self.server.connections.find(function(connection) {
        return connection.user;
      });
      
      if (!userStore) {
        return reject(new Error('this service require user store connection'));
      }

      debug.info(userStore);
      return obilUser.init({store: userStore.user}).then(function(userInst) {
        // Set user helper for handlers
        helpers.map().set('user', userInst);
        helpers.map().set('session', userInst);
        self.started = true;
        return resolve(self);
      }).catch(function(err) {
        return reject(err);
      });

    });
  });
};

/**
 * Exposed stop method
 * @return {object} returns a promise with the instance of auth service
 */
DashbotService.prototype.stop = function() {
  var self = this;

  return utils.core.promise(function(resolve, reject) {
    if (!self.started) {
      return reject(new Error('The server is not running'));
    }

    return helpers.map().get('user').close().then(function closingUser() {
      self.server.stop().then(function() {
        self.started = false;
        return resolve(self);
      });
    });
  });
};

/**
 * Exposed restart method
 * @return {object} returns a promise with the instance of auth service
 */
DashbotService.prototype.restart = function() {
  var self = this;

  if (!this.started) {
    return utils.core.promise(function(resolve, reject) {
      return reject(new Error('The server is not running'));
    });
  }

  return this.server.stop().then(function() {
    return self.server.start();
  });
};

/**
 * @function init
 * Exposing init method on module
 */

 DashbotService.start = function(options) {
  const opts = Object.assign(options || {}, config);
  
  opts.routes = routes;
  opts.plugins = plugins;

  return (new DashbotService(opts)).start();
};

module.exports = DashbotService;
