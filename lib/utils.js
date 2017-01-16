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

  var http = require('http'),
      https = require('https'),
      url = require('url'),
      buffer = require('buffer').Buffer,
      marc_record_converters = require('marc-record-converters');
  
  module.exports = {
    getCredentials: function(request) {

      var str = request.get('Authorization');

      if (str) {

        str = buffer.from(str.split(/ /).pop(), 'base64').toString('utf8');        

        return str.split(/:/).reduce(function(product, item, index) {
          return Object.defineProperty(product, index === 0 ? 'username' : 'password', {
            value: item,
            enumerable: true
          });
        }, {});
        
      } 
      
    },
    parseRecord: function(data) {
      return marc_record_converters.marc21slimXML.from(data);
    },
    serializeRecord: function(record) {
      return marc_record_converters.marc21slimXML.to(record);
    },
    fetchResource: function(resource_url, options) {
      return new Promise(function(resolve, reject) {

        var fn_http_get = /^https/.test(resource_url) ? https.get : http.get;
        
        fn_http_get(Object.assign(url.parse(resource_url), typeof options === 'object' ? options : {}))
          .on('response', function(response) {
            
            var data = '';
            
            response
              .on('data', function(chunk) {
                data += chunk;
              })
              .on('end', function() {
                if (response.statusCode !== 200) {
                  reject({
                    statusCode: response.statusCode,
                    message: data
                  });
                } else {
                  resolve(data);
                }
              });
            
            
          }).on('error', reject);
        
      });      
    },
    methodNotAllowedCallback: function(request, response, next) {
      response.status(405);
      next();
    },
    sendError: function(response, message) {
      response.status(500).type('application/json').send({
        error: {
          message: message
        }
      });
    }
  };

}());
