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

  var FETCH_API_PATH_GET_RECORD = '/cgi-bin/getSingleRecord.cgi',
      MANDATORY_PARAMETERS = Object.seal(Object.freeze({
        'POST': ['library', 'catLocation', 'opacSuppress']
      }));

  function validateQueryParams(params, required_keys) {
    required_keys.forEach(function(key) {
      if (params.indexOf(key) < 0) {
        throw new Error("Parameter '" + key + "' is required");
      }
    });
  }
  
  module.exports = function(options, voyager_batchcat) {
    
    var express = require('express'),        
        utils = require('../utils'),
        router = new express.Router();

    function routeFoundCallback(request, response, next) {
      response.routed = true;
      next();
    }
    
    router.param('id', function(request, response, next, id) {
      request.recordId = id;
      next();
    });    
    
    router.route('/:id')
      .get(routeFoundCallback, function(request, response, next) {

        utils.fetchResource(options.fetchApi.url + FETCH_API_PATH_GET_RECORD + '?recordType=bib&recordId=' + request.params.id, options.fetchApi.options).then(
          function(data) {
            try {              
              response.status(200).type('application/xml').send(utils.serializeRecord(utils.parseRecord(data)));
              next();
            } catch (error) {
              next(error);
            }
          },
          function(error) {
            if (error.hasOwnProperty('statusCode') && error.statusCode === 404) {
              response.status(404);
              next();            
            } else {
              next(error);
            }
          }
        );
        
      })
      .delete(routeFoundCallback, function(request, response, next) {

        var creds = utils.getCredentials(request);
        console.log(creds);
        next();
      })
      .put(routeFoundCallback, function(request, response, next) {

        var creds = utils.getCredentials(request),
            record = utils.parseRecord(request.body);
        
      });

    router.post('/', routeFoundCallback, function(request, response, next) {

      var result, record,
          creds = utils.getCredentials(request);

      if (typeof request.body !== 'string') {
        response.status(415).send();
      } else {

        try {
          record = utils.parseRecord(request.body);
        } catch (e) {
          response.status(400).type('application/json').send({
            error: {
              message: 'Invalid record data'
            }
          });
        }

        if (record) {

          if (Array.isArray(record)) {
            response.status(400).type('application/json').send({
              error: {
                message: 'Multiple records are not supported'
              }
            });
          } else {

            try {
              validateQueryParams(Object.keys(request.query), MANDATORY_PARAMETERS.POST);
            } catch (e) {
              
              response.status(400).type('application/json').send({
                error: {
                  message: e.message
                }
              });

              next();
              return;

            }
            
            result = voyager_batchcat.bib.addRecord(record, request.query.library, request.query.catLocation, request.query.opacSuppress, creds);
            
            if (result.hasOwnProperty('error')) {
              response.status(400).type('application/json').send(result.error);
            } else {
              response.status(201).location(options.externalURL + '/bib/' + result.recordId).send();
            }

          }

        }

      }
      
      next();
      
    });
    
    return router;
    
  };

}());
