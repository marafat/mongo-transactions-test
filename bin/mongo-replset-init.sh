#!/usr/bin/env bash

mongo $MONGO_HOST --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '${MONGO_HOST}' }] })"
