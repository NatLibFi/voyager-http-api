const HttpStatus = require('http-status-codes');
const utils = require('./utils');
const difference = require('lodash.difference');

function checkCredentials(creds) {
  if (!(typeof creds === 'object' && typeof creds.username === 'string' && typeof creds.password === 'string')) {
    throw new Error('Credentials not provided');
  }
}

function requireCredentials(request, response, next) {

  const creds = utils.getCredentials(request);

  try {
    checkCredentials(creds);
    request.userCredentials = creds;
    next();
  } catch (e) {
    response.status(HttpStatus.UNAUTHORIZED).end();
    return;
  }
}

function requireBody(request, response, next) {

  if (typeof request.body !== 'string') {
    response.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).end();
  } else {
    next();
  }
}

function parseRecord(request, response, next) {

  try {
    const record = utils.parseRecord(request.body);
    request.record = record;
    next();
  } catch (e) {
    response.status(HttpStatus.BAD_REQUEST).type('application/json').send({
      error: {
        message: 'Invalid record data'
      }
    });
  }    
}

function requireQueryParams(requiredQueryParams) {
  return function(request, response, next) {
    
    const missingQueryParams = difference(requiredQueryParams, Object.keys(request.query));
    if (missingQueryParams.length === 0) {
      next();
    } else {
      response.status(HttpStatus.BAD_REQUEST).type('application/json').send({
        error: {
          message: 'The following parameters are required: ' + missingQueryParams.join(', ')
        }
      });
    }
  };
}

module.exports = {
  requireCredentials, requireBody, parseRecord, requireQueryParams
};