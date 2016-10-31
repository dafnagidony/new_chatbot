var server = require('obil-server');
var os = require('os');
var pckg = require('../package');
var configHelper = server.utils.config;
var nodeEnv = process.env.NODE_ENV || 'development';
var host = os.hostname().split('.')[0];
var INFRA_ENVS = ['staging', 'production', 'test'];
var infraMap = {
  connections: {
    user: {
      host: 'REDIS.obil_user.host',
      port: 'REDIS.obil_user.port',
      db: 'REDIS.obil_user.db'
    }
  }
};

/**
 * @namespace {Object} config Configuration for Utils module
 */
var config = {};

config.common = {
  aclFree: 1,
  name: pckg.name,
  owner: 'vr',
  tags: ['vrfrontend'],

  logger: {
    type: 'obil',
    owner: 'vr'
  },

  connections: {
    session: {
      host: '127.0.0.1',
      port: 6379,
      type: 'redis',
      db: 1
    },
    user: {
      host: '127.0.0.1',
      port: 6379,
      type: 'redis',
      db: 1
    }
  },

  // Secret for session.
  session: {
    secret: 'F6tiuHKJDgvbm',
    maxAge: 2592000000, // 30 days (in milliseconds)
    name: 'dashbot',
    cookie: {
      httpOnly: true
    },
    saveUninitialized: false,
    resave: false
  },
};


config.development = {
  hostname: '127.0.0.1',
  port: '3000',
  env: 'development'
};





config.jenkins = {
  hostname: '0.0.0.0',
  port: '3000',
  env: 'jenkins',

  connections: {
    session: {
      host: 'redis1-19001-stg-chidc2.chidc2.outbrain.com',
      port: 6379,
      type: 'redis',
      db: 1
    },
    user: {
      host: 'redis1-19001-stg-chidc2.chidc2.outbrain.com',
      port: 6379,
      type: 'redis',
      db: 1
    }
  }
};

config.test = {
  hostname: '0.0.0.0',
  port: '3000',
  env: 'test',
  environment: 'test',

  consul: {
    interval: '15s'
  },
  client: {
    host: 'http://editorial-qa2.outbrain.com'
  },
  metrics: {
    host: 'statsd',
    port: '8125',
    options: {
      scope: 'services.test.OBilAuthService.' + host
    }
  },
  logger: {
    type: 'obil',
    owner: 'vr',
    outputFormat: 'json',
    sink: 'logstash',
    minLevel: 'NOTICE'
  },
  connections: {
    session: {
      host: 'redis1-19001-stg-chidc2.chidc2.outbrain.com',
      port: 6379,
      type: 'redis',
      db: 10
    },
    user: {
      host: 'redis1-19001-stg-chidc2.chidc2.outbrain.com',
      port: 6379,
      type: 'redis',
      db: 10
    }
  },
  services: {
    vrconfig: {
      dc: 'chidc2',
      discoverable: true,
      protocol: 'http',
      service: 'vr_api_config',
      tag: 'environment-test'
    }
  }
};

config.staging = {
  hostname: '0.0.0.0',
  port: '3000',
  env: 'staging',

  consul: {
    interval: '15s'
  },
  client: {
    host: 'https://editorial.outbrain.com'
  },
  metrics: {
    host: 'statsd',
    port: '8125',
    options: {
      scope: 'services.stg.OBilAuthService.' + host
    }
  },
  logger: {
    type: 'obil',
    owner: 'vr',
    outputFormat: 'json',
    sink: 'logstash',
    minLevel: 'NOTICE'
  },
  connections: {
    session: {
      host: 'redis1-19001-stg-chidc2.chidc2.outbrain.com',
      port: 6379,
      type: 'redis',
      db: 10
    },
    user: {
      host: 'redis1-19001-stg-chidc2.chidc2.outbrain.com',
      port: 6379,
      type: 'redis',
      db: 10
    }
  },
  services: {
    vrconfig: {
      dc: 'chidc2',
      discoverable: true,
      protocol: 'http',
      service: 'vr_api_config',
      tag: 'environment-production'
    }
  }
};

config.production = {
  hostname: '0.0.0.0',
  port: '3000',
  env: 'production',

  consul: {
    interval: '15s'
  },
  client: {
    host: 'https://editorial.outbrain.com'
  },
  metrics: {
    host: 'statsd',
    port: '8125',
    options: {
      scope: 'services.prod.OBilAuthService.' + host
    }
  },
  logger: {
    type: 'obil',
    owner: 'vr',
    outputFormat: 'json',
    sink: 'logstash',
    minLevel: 'NOTICE'
  },
  connections: {
    session: {
      host: 'redis1-standalone',
      port: 6379,
      type: 'redis',
      db: 10
    },
    user: {
      host: 'redis1-standalone',
      port: 6379,
      type: 'redis',
      db: 10
    }
  },
  services: {
    vrconfig: {
      discoverable: true,
      protocol: 'http',
      service: 'vr_api_config',
      tag: 'environment-production'
    }
  }
};

var _config = configHelper.load(INFRA_ENVS, Object.assign(config.common, config[nodeEnv]), infraMap);

module.exports = _config;
