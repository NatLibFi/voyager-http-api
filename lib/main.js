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
  
  module.exports = function(options, voyager_batchcat) {
    
    var fs = require('fs'),
        http = require('http'),
        https = require('https'),
        deepAssign = require('deep-assign'),
        moment = require('moment'),
        express = require('express'),
        body_parser = require('body-parser'),
        utils = require('./utils'),
        createBibRouter = require('./resources/bib'),
        app = express();

    function initializeOptions(options) {

      options = deepAssign(JSON.parse(JSON.stringify(DEFAULT_OPTIONS)), typeof options === 'object' ? options : {});

      if (typeof options.iniFile !== 'string') {
        throw new Error("'iniFile' option is mandatory");
      } else if (typeof options.externalURL !== 'string') {
        throw new Error("'externalURL' option is mandatory");
      } else if (typeof options.fetchApi !== 'string' && typeof options.fetchApi !== 'object') {
        throw new Error("'fetchApi' option is mandatory");
      } else {        
        return Object.assign(options, {
          fetchApi: typeof options.fetchApi === 'object' ? options.fetchApi : {
            url: options.fetchApi          
          }
        });
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
      response.send();
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

    app.use('/bib', createBibRouter({
      iniFile: options.iniFile,
      fetchApi: options.fetchApi,
      externalURL: options.externalURL
    }, voyager_batchcat), handleUnroutedMiddleware, logRequestMiddleware);
    
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

}());
    
           
