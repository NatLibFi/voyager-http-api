/**
* Copyright 2017-2018 University Of Helsinki (The National Library Of Finland)
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
  moment = require('moment'),
  marc_record_converters = require('marc-record-converters');

  var VOYAGER_DATE_FORMAT = 'DD.MM.YYYY HH:mm:ss';

  module.exports = {
    getRecord: function(connection, id, options) {
      var SQL_QUERY = 'select utl_raw.CAST_TO_RAW(RECORD_SEGMENT) as SEG from '+options.name+'.BIB_DATA where '+options.type.toUpperCase()+'_id = :id order by SEQNUM';

      return connection.execute(SQL_QUERY, [id]).then(
        function(segments) {
          if (segments.rows.length === 0) {
            throw Object.assign(new Error(), { statusCode: 404 });
          }

          var buffers = segments.rows.map(row => row.SEG);
          var data = Buffer.concat(buffers).toString('utf-8');
          return  marc_record_converters.iso2709.from(data);
        }
      );
    },
    getRecordHistory: function(connection, id, options) {

      var SQL_QUERY = 'SELECT * FROM '+options.name+'.'+options.type+'_history WHERE '+options.type+'_id = :id ORDER BY action_date desc';

      return connection.execute(SQL_QUERY, [id], {resultSet: true}).then(
        function(result) {
          return result.resultSet.getRow().then(function(data) {
            return result.resultSet.close().then(function() {
              if (data) {
                return {
                  type: Number.parseInt(data.ACTION_TYPE_ID),
                  encodingLevel: Number.parseInt(data.ENCODING_LEVEL),
                  location: Number.parseInt(data.LOCATION_ID),
                  opacSuppress: data.SUPPRESS_IN_OPAC === 'Y' ? true : false,
                  operator: data.OPERATOR_ID,
                  date: moment(data.ACTION_DATE, VOYAGER_DATE_FORMAT).format()
                };
              }

              throw Object.assign(new Error(), { statusCode: 404 });
            });
          });
        }
      );
    },
    getRecordUpdateDate: function(connection, id, options) {

      var SQL_QUERY = 'SELECT create_date,update_date FROM '+options.name+'.'+options.type+'_master WHERE bib_id = :id';

      return connection.execute(SQL_QUERY, [id], {resultSet: true}).then(
        function(result) {
          return result.resultSet.getRow().then(function(data) {
            if (data) {
              return result.resultSet.close().then(function() {
                var date = data.UPDATE_DATE || data.CREATE_DATE;
                return moment(date, VOYAGER_DATE_FORMAT);
              });
            }

            throw Object.assign(new Error(), { statusCode: 404 });
          });
        }
      );
    },
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
    serializeRecord: function(record) {
      return marc_record_converters.marc21slimXML.to(record);
    },
    validateRecord: function(record) {
      const findInvalidTags = record => record.fields.filter(field => !/^\d{3}$/.test(field.tag));

      const invalidTags = findInvalidTags(record).map(field => field.tag);

      if (invalidTags.length > 0) {
        const validationError = new Error(`The following fields are not supported: ${invalidTags.join(', ')}`);
        throw validationError;
      }

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
    },
    parseRecord: parseRecord
  };

  function parseRecord(str) {
    return marc_record_converters.marc21slimXML.from(str)
  }

}());
