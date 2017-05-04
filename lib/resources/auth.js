'use strict';

const express = require('express');
const HttpStatus = require('http-status-codes');
const Middlewares = require('../middlewares');

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

  router.put('/:id', Middlewares.requireCredentials, Middlewares.requireBody, Middlewares.parseRecord, (request, response) => {
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

  router.post('/', Middlewares.requireCredentials, Middlewares.requireBody, Middlewares.parseRecord, (request, response) => {
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