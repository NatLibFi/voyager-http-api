'use strict';

const express = require('express');
const HttpStatus = require('http-status-codes');

const utils = require('../utils');

function checkCredentials(creds) {
  if (!(typeof creds === 'object' && typeof creds.username === 'string' && typeof creds.password === 'string')) {
    throw new Error('Credentials not provided');
  }
}

function requireCredentialsMiddleware(request, response, next) {

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

function requireBodyMiddleware(request, response, next) {

  if (typeof request.body !== 'string') {
    response.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).end();
  } else {
    next();
  }
}

function parseRecordMiddleware(request, response, next) {

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

module.exports = (authorityService, logger) => {

  const router = new express.Router();

  router.get('/:id', (request, response) => {

    const recordId = request.params.id;

    authorityService.get(recordId)
      .then((record) => {
        response.type('application/xml').send(record);
      })
      .catch(error => {
        logger.error(`Error reading authority ${recordId}`, error);
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
      });
  });

  router.put('/:id', requireCredentialsMiddleware, requireBodyMiddleware, parseRecordMiddleware, (request, response) => {
    const recordId = request.params.id;
    const creds = request.userCredentials;
    const record = request.record;

    authorityService.update(creds, recordId, record)
    .then(record => {
      response.type('application/xml').send(record);
    })
    .catch(error => {
      logger.error(`Error updating authority ${recordId}`, error);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR);
    });  
  });

  router.post('/', requireCredentialsMiddleware, requireBodyMiddleware, parseRecordMiddleware, (request, response) => {
    const recordId = request.params.id;
    const creds = request.userCredentials;
    const record = request.record;

    authorityService.create(creds, recordId, record)
    .then(record => {
      response.type('application/xml').send(record);
    })
    .catch(error => {
      logger.error('`Error creating authority', error);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR);
    });  
  });



  return router;
};
