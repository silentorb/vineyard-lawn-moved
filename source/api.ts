// Vineyard Lawn

import * as express from "express"
import * as body_parser from 'body-parser'
export * from './errors'

// const json_parser = body_parser.json()
const json_temp = body_parser.json()
const json_parser = function (req, res, next) {
  json_temp(req, res, next)
}
export enum Method {
  get,
  post,
  put,
  delete
}

export interface Request {
  data: any
  session: any
  user?: any
}

export type Promise_Or_Void = Promise<void> | void
export type Request_Processor = (request: Request) => Promise<Request>
export type Response_Generator = (request: Request) => Promise<any>
export type Filter = (request: Request) => Promise_Or_Void

export interface Endpoint_Info {
  method: Method
  path: string
  action: Response_Generator
  middleware?: any[]
  filter?: Filter
}

export interface Optional_Endpoint_Info {
  method?: Method
  path?: string
  action?: Response_Generator
  middleware?: any[]
  filter?: Filter
}

export function handle_error(res, error) {
  const status = error.status || 500

  if (!error.stack)
    console.error("Error", status, error.message)
  else
    console.error("Error", status, error.stack)

  const message = status == 500 ? "Server Error" : error.message
  res.statusMessage = message
  res.status(status).send({
    message: message
  })
}

// This function is currently modifying req.body for performance though could be changed if it ever caused problems.
function get_arguments(req: express.Request) {
  const result = req.body || {}
  for (let i in req.query) {
    result[i] = req.query[i]
  }
  if (req.params) {
    for (let i in req.params) {
      result[i] = req.params[i]
    }
  }
  return result
}

export function create_handler(endpoint: Endpoint_Info, action) {
  return function (req, res) {
    try {
      const request = {
        data: get_arguments(req),
        session: req.session
      }
      action(request)
        .then(function (content) {
            res.send(content)
          },
          function (error) {
            handle_error(res, error)
          })
    }
    catch (error) {
      handle_error(res, error)
    }
  }
}

export function attach_handler(app: express.Application, endpoint: Endpoint_Info, handler) {
  let path = endpoint.path
  if (path [0] != '/')
    path = '/' + path

  const middleware = endpoint.middleware || []
  switch (endpoint.method) {
    case Method.get:
      app.get(path, middleware, handler)
      break;

    case Method.post:
      app.post(path, [json_parser].concat(middleware), handler)
      break;

    case Method.put:
      app.put(path, [json_parser].concat(middleware), handler)
      break;

    case Method.delete:
      app.delete(path, [json_parser].concat(middleware), handler)
      break;

  }
}

export function create_endpoint(app: express.Application, endpoint: Endpoint_Info,
                                preprocessor: Request_Processor = null) {
  const action = preprocessor
    ? request => preprocessor(request).then(request => endpoint.action(request))
    : endpoint.action

  const handler = create_handler(endpoint, action)
  attach_handler(app, endpoint, handler)
}

export function create_endpoint_with_defaults(app: express.Application, endpoint_defaults: Optional_Endpoint_Info,
                                              endpoint: Optional_Endpoint_Info,
                                              preprocessor: Request_Processor = null) {
  create_endpoint(app, Object.assign({}, endpoint_defaults, endpoint), preprocessor)
}

export function create_endpoints(app: express.Application, endpoints: Endpoint_Info[],
                                 preprocessor: Request_Processor = null) {
  for (let endpoint of endpoints) {
    create_endpoint(app, endpoint, preprocessor)
  }
}

