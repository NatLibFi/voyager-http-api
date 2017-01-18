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

  var voyager_batchcat,
      express = require('express'),
      xmldom = require('xmldom-xplat'),
      moment = require('moment'),
      utils = require('../utils'),
      createVoyagerBatchcat = require('voyager-batchcat-js');
  
  var FETCH_API_PATH_GET_RECORD = '/cgi-bin/getSingleRecord.cgi',
      MARC_EXTENDED_NAMESPACE = 'http://linneatest.csc.fi/marcextended',
      ACTION_DATE_FORMAT = 'DD.MM.YYYY HH:mm:ss',
      STATUS_CODE_INVALID_CREDENTIALS = 27,
      STATUS_CODE_UPDATE_RECORD_INVALID_RECORD_ID = 13,
      STATUS_CODE_DELETE_RECORD_INVALID_RECORD_ID = 13,
      MANDATORY_PARAMETERS = Object.seal(Object.freeze({
        'POST': ['library', 'catLocation', 'opacSuppress'],
        'PUT': ['library', 'catLocation', 'opacSuppress']
      }));
  
  function validateQueryParams(params, required_keys) {
    required_keys.forEach(function(key) {
      if (params.indexOf(key) < 0) {
        throw new Error("Parameter '" + key + "' is required");
      }
    });
  }
  
  function checkCredentials(creds) {
    if (!(typeof creds === 'object' && typeof creds.username === 'string' && typeof creds.password === 'string')) {
      throw new Error('Credentials not provided');
    }
  }
  
  module.exports = function(options, createVoyagerBatchcatCustom) {
    
    var router = new express.Router();

    function routeFoundCallback(request, response, next) {
      response.routed = true;
      next();
    }
    
    function writeRecordCallback(request, response, next) {
      
      var record, record_id,
          creds = utils.getCredentials(request);

      try {
        checkCredentials(creds);
      } catch (e) {
        response.status(401).send(); 
        next();
        return;
      }
      
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
              validateQueryParams(Object.keys(request.query), MANDATORY_PARAMETERS[request.method.toUpperCase()]);
            } catch (error) {
              
              if (/^Parameter '\w+' is required$/.test(error.message)) {
                response.status(400).type('application/json').send({
                  error: {
                    message: error.message
                  }
                });
                next();
              } else {
                next(error);
              }
              
              return;

            }
            
            try {
              if (request.method === 'POST') {
                record_id = voyager_batchcat.bib.addRecord(record, request.query.library, request.query.catLocation, request.query.opacSuppress, {
                  username: creds.username,
                  password: creds.password
                });
              } else {
                voyager_batchcat.bib.updateRecord(request.params.id, record, request.query.library, request.query.catLocation, request.query.opacSuppress, {
                  username: creds.username,
                  password: creds.password
                });
              }
            } catch (error) {
              if (typeof error === 'object' && error.hasOwnProperty('errorCode')) {
                
                if (error.errorCode === STATUS_CODE_INVALID_CREDENTIALS) {
                  response.status(401).type('application/json').send();
                } else if (request.method === 'PUT' && error.errorCode === STATUS_CODE_UPDATE_RECORD_INVALID_RECORD_ID) {
                  response.status(404).send();    
                } else {
                  response.status(400).type('application/json').send({
                    message: error.message,
                    code: error.errorCode
                  });
                }
                
                next();
                return;
                
              } else {
                next(error);
                return;
              }
            }
            
            if (request.method === 'POST') {
              response.status(201).location(options.externalURL + '/bib/' + record_id).send();
            } else {
              response.status(204).send();
            }

          }

        }

      }
      
      next();
      
    }
    
    createVoyagerBatchcat = typeof createVoyagerBatchcatCustom === 'function' ? createVoyagerBatchcatCustom : createVoyagerBatchcat; 
    voyager_batchcat = createVoyagerBatchcat({
      iniDir: options.iniFile
    });
    
    router.param('id', function(request, response, next, id) {
      next();
    });    

    router.route('/:id/history').get(routeFoundCallback, function(request, response, next) {

      utils.fetchResource(options.fetchApi.url + FETCH_API_PATH_GET_RECORD + '?recordType=bib&recordId=' + request.params.id, options.fetchApi.options).then(
        function(data) {

          var doc, action_nodes, action_node,
              actions = [];
          
          try {
            
            doc = new xmldom.DOMParser().parseFromString(data, 'application/xml');
            action_nodes = doc.getElementsByTagNameNS(MARC_EXTENDED_NAMESPACE, 'action');

            for(var i=0;i < action_nodes.length; i++) {              

              action_node = action_nodes.item(i);
              
              actions.push({
                type: Number.parseInt(action_node.getElementsByTagNameNS(MARC_EXTENDED_NAMESPACE, 'actionTypeId').item(0).textContent),
                encodingLevel: Number.parseInt(action_node.getElementsByTagNameNS(MARC_EXTENDED_NAMESPACE, 'encodingLevel').item(0).textContent),
                location: Number.parseInt(action_node.getElementsByTagNameNS(MARC_EXTENDED_NAMESPACE, 'locationId').item(0).textContent),
                opacSuppress: action_node.getElementsByTagNameNS(MARC_EXTENDED_NAMESPACE, 'suppressInOpac').item(0).textContent === 'Y' ? true : false,
                operator: action_node.getElementsByTagNameNS(MARC_EXTENDED_NAMESPACE, 'operatorId').item(0).textContent,
                date: moment(action_node.getElementsByTagNameNS(MARC_EXTENDED_NAMESPACE, 'actionDate').item(0).textContent, ACTION_DATE_FORMAT).format(undefined)
              });
              
            }

            response.status(200).type('application/json').send({
              actions: actions
            });
            
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

        try {
          checkCredentials(creds);
        } catch (e) {
          response.status(401).send(); 
          next();
          return;
        }

        try {
          voyager_batchcat.bib.deleteRecord(request.params.id, {
            username: creds.username,
            password: creds.password
          });
        } catch (error) {
          if (typeof error === 'object' && error.hasOwnProperty('errorCode')) {
            
            if (error.errorCode === STATUS_CODE_INVALID_CREDENTIALS) {
              response.status(401).type('application/json').send();
            } else if (error.errorCode === STATUS_CODE_DELETE_RECORD_INVALID_RECORD_ID) {
              response.status(404).send();    
            } else {
              response.status(400).type('application/json').send({
                message: error.message,
                code: error.errorCode
              });
            }
            
            next();
            return;
            
          } else {
            next(error);
            return;
          }
        }
        
        response.status(204).send();  
        next();
        
      })
      .put(routeFoundCallback, writeRecordCallback);

    router.post('/', routeFoundCallback, writeRecordCallback);
    
    return router;
    
  };

}());
