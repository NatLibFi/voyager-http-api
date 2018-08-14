/**
* Copyright 2017 University Of Helsinki (The National Library Of Finland)
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

(function() {

  'use strict';

  var DEFAULT_OPTIONS = Object.seal(Object.freeze({
    port: 8080,
    logging: {
      timestampFormat: 'YYYY-MM-DD HH:mm:ss'
    }
  }));

  module.exports = function(options, createVoyagerBatchcat) {

    var fs = require('fs'),
    http = require('http'),
    https = require('https'),
    deepAssign = require('deep-assign'),
    moment = require('moment'),
    express = require('express'),
    oracle = require('oracledb'),
    body_parser = require('body-parser'),
    utils = require('./utils'),
    createBibRouter = require('./resources/bib'),
    createAuthorityRouter = require('./resources/auth'),
    createAuthorityService = require('./services/authority-service'),
    app = express();

    oracledb.outFormat = oracledb.OBJECT;

    function initializeOptions(options) {

      options = deepAssign(JSON.parse(JSON.stringify(DEFAULT_OPTIONS)), typeof options === 'object' ? options : {});

      if (typeof options.iniFile !== 'string') {
        throw new Error("'iniFile' option is mandatory");
      } else if (typeof options.externalURL !== 'string') {
        throw new Error("'externalURL' option is mandatory");
      } else if (typeof options.db !== 'object') {
        throw new Error("'db' option is mandatory");
      } else {
        return options;
      }

    }

    function logMessage(message) {
      console.log('[' + moment().format(options.logging.timestampFormat) + '] ' + message);
    }

    function logRequest(request, response) {
      logMessage('(' + request.ip + ') ' + request.method + ' ' + request.originalUrl + ' ' + response.statusCode);
    }

    function logRequestMiddleware(request, response, next) {
      logRequest(request, response);
      if (!response.headersSent) {
        response.send();
      }
    }

    function handleUnroutedMiddleware(request, response, next) {

      if (!response.routed) {
        response.status(405);
      }

      next();

    }

    options = initializeOptions(options);

    app.use(body_parser.text({
      type: 'application/xml'
    }));

    app.use('/bib', createBibRouter(
      {
        iniFile: options.iniFile,
        externalURL: options.externalURL,
        db: {
          name: options.db.database,
          type: 'bib'
        }
      },
      getOracleConnection(options.db),
      createVoyagerBatchcat
    ), handleUnroutedMiddleware, logRequestMiddleware);


    const createVoyagerBatchcatDef = require('voyager-batchcat-js');

    const voagerBatchcat = createVoyagerBatchcatDef({
      iniDir: options.iniFile
    });

    const authorityService = createAuthorityService({
      db: {
        name: options.db.database,
        type: 'aut'
      },
      externalURL: options.externalURL
    }, getOracleConnection(options.db), voagerBatchcat);

    const logger = {
      log: console.log.bind(console),
      error: console.error.bind(console)
    };

    const authorityRouterOptions = {
      externalURL: options.externalURL
    };

    app.use('/auth', createAuthorityRouter(authorityService, logger, authorityRouterOptions));

    app.use(function(request, response, next) {
      response.status(404);
      next();
    }, logRequestMiddleware);

    app.use(function (error, request, response, next) {
      response.status(500).send();
      logRequest(request, response);
      console.error(error.hasOwnProperty('stack') ? error.stack : error);
    });

    app.listen(options.port);
    logMessage('Started voyager-http-api on port ' + options.port);

  };

  function getOracleConnection(options) {

  }

}());
