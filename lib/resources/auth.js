'use strict';

const express = require('express');
const HttpStatus = require('http-status-codes');
const Middlewares = require('../middlewares');
const utils = require('../utils');

module.exports = (authorityService, logger, options) => {

  const router = new express.Router();

  router.get('/:id', (request, response) => {

    const recordId = request.params.id;

    authorityService.get(recordId)
      .then((record) => {
        response.type('application/xml').send(utils.serializeRecord(record));
      })
      .catch(error => {
        logger.error(`Error reading authority ${recordId}`, error);
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
      });
  });

  router.put('/:id', Middlewares.requireCredentials, Middlewares.requireBody, Middlewares.parseRecord, Middlewares.requireQueryParams(['catLocation']), (request, response) => {
    const recordId = request.params.id;
    const creds = request.userCredentials;
    const record = request.record;
    const catLocation = request.query.catLocation;

    authorityService.update(creds, catLocation, recordId, record)
    .then(() => {
      response.type('application/xml').status(HttpStatus.NO_CONTENT).end();
    })
    .catch(error => {
      logger.error(`Error updating authority ${recordId}`, error);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
    });  
  });

  router.post('/', Middlewares.requireCredentials, Middlewares.requireBody, Middlewares.parseRecord, Middlewares.requireQueryParams(['catLocation']), (request, response) => {
    const creds = request.userCredentials;
    const record = request.record;
    const catLocation = request.query.catLocation;

    authorityService.create(creds, catLocation, record)
    .then(recordId => {

      const externalUrl = options && options.externalURL || '';
      const resourceLocation = `${externalUrl}/auth/${recordId}`;
      
      response
        .type('application/xml')
        .location(resourceLocation)
        .set({ 'Resource-Id': recordId })
        .status(HttpStatus.CREATED)
        .end();
    })
    .catch(error => {
      logger.error('Error creating authority', error);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
    });  
  });

  router.delete('/:id', Middlewares.requireCredentials, (request, response) => {
    const recordId = request.params.id;
    const creds = request.userCredentials;

    authorityService.delete(creds, recordId)
    .then(() => {
      response.type('application/xml').status(HttpStatus.NO_CONTENT).end();
    })
    .catch(error => {
      logger.error(`Error updating authority ${recordId}`, error);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
    });
  });

  return router;
};
