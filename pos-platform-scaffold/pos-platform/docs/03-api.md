# API

Fastify modules under apps/api/src/modules, vertical-slice shape: routes → controller → service → repository → test. tenant_id resolved server-side from the session, never from the request body.
