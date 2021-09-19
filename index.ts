import hapi from '@hapi/hapi';
import Inert from '@hapi/inert';
import * as fs from 'fs';
import Loki from 'lokijs';
import { loadCollection } from './utils.js';
import { v4 as uniqueId } from 'uuid';
import * as Boom from '@hapi/boom';

/**
 * 
 * Setup
 * 
 */

const COLLECTION_PICTURES = 'pictures';
const COLLECTION_DATA = 'phone_data.json';
const UPLOAD_PATH = 'uploads';

const db = new Loki(`${UPLOAD_PATH}/${COLLECTION_DATA}`, { persistenceMethod: 'fs' });
// create destination folder if does not exist yet
if (!fs.existsSync(UPLOAD_PATH)) fs.mkdirSync(UPLOAD_PATH);

/**
 * 
 * API
 * 
 */

const init = async () => {
  const server: hapi.Server = new hapi.Server({
    port: 3001,
    host: 'localhost',
    routes: {
      cors: true,
      files: {
        relativeTo: `./${COLLECTION_PICTURES}`,
      }
    },
  });

  // static file handler
  await server.register(Inert)

  /**
   * POST
   */

  server.route({
    method: 'POST',
    path: '/new-phone',
    options: {
      payload: {
        allow: 'multipart/form-data',
        parse: true,
        multipart: {
          output: 'stream',
        }
      }
    },
    handler: async (request: hapi.Request, h: hapi.ResponseToolkit) => {
      try {
        const data: Phone = <Phone>request.payload;
        const { file, ...rest } = data
        
        // save image file
        const { filename } = file.hapi;
        const { _data } = file
        fs.writeFile(`./${COLLECTION_PICTURES}/${filename}`, _data, err => {
          if (err) {
            console.log('Could not upload image: ', err)
            return h.response('Failed to upload image.').code(200);
          }
        })

        // save data
        const col = await loadCollection(COLLECTION_DATA, db);
        col.insert({
          id: uniqueId(),
          ...rest,
          imageFileName: filename,
        })
        db.saveDatabase();

        return h.response({ success: true }).code(200);
      } catch (err) {
        return (Boom.badRequest(err.message, err));
      }
    }
  });

  /**
   * DELETE
   */

  server.route({
    method: 'DELETE',
    path: '/delete-phone/{id}',
    handler: async (request: hapi.Request, h: hapi.ResponseToolkit) => {
      try {
        const col = await loadCollection(COLLECTION_DATA, db);
        col.chain().find({ id: request.params.id }).remove()
        db.saveDatabase();

        return h.response({ success: true }).code(200);
      } catch (err) {
        return (Boom.badRequest(err.message, err));
      }
    }
  });

  /**
   * GET
   */

  server.route({
    method: 'GET',
    path: '/phones',
    handler: async (request: hapi.Request, h: hapi.ResponseToolkit) => {
      try {
        const col = await loadCollection(COLLECTION_DATA, db);

        const { data } = col
        return h.response(data.map(({ $loki, ...phone }) => ({ ...phone }))).code(200);
        
      } catch (err) {
        return (Boom.badRequest(err.message, err));
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/phone/{id}',
    handler: async (request: hapi.Request, h: hapi.ResponseToolkit) => {
      try {
        const col = await loadCollection(COLLECTION_DATA, db);

        const { data } = col
        return h.response(data.find(phone => phone.id === request.params.id)).code(200);
        
      } catch (err) {
        return (Boom.badRequest(err.message, err));
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/{filename}',
    handler: {
      file: request => request.params.filename
    }
  })

  /**
   * Start API
   */
  await server.start();
  console.log(`Server started at: ${server.info.uri}`);
}

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});

init();