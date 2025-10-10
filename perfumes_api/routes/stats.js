const express = require('express');
const Response = require('../lib/Response');
const AuditLogs = require('../lib/AuditLogs');
const Users = require('../db/models/Users');
const Perfumes = require('../db/models/Perfumes');
const Topics = require('../db/models/Topics');
const router = express.Router();
const auth = require("../lib/auth")();

router.all("*", auth.authenticate(), (req, res, next) => {
    next();
});

router.get("/auditlogs/comments", auth.checkRoles("auditlogs_view") ,async (req, res) => {
    try {
        let result = await AuditLogs.aggregate([
            {$match: {location: "Comments"}},
            {$group: {_id: {email: "$email", proc_type: "$proc_type"}, count: {$sum: 1}}},
            {$sort: {counst: -1}}
        ]);

        res.json(Response.successResponse(result));

    } catch (err) {
        let errorResponse = Response.errorResponse(err, req.user.language);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get("/auditlogs/topic_comments", auth.checkRoles("auditlogs_view") ,async (req, res) => {
    try {
        let result = await AuditLogs.aggregate([
            {$match: {location: "Comments_of_Topics"}},
            {$group: {_id: {email: "$email", proc_type: "$proc_type"}, count: {$sum: 1}}},
            {$sort: {counst: -1}}
        ]);

        res.json(Response.successResponse(result));

    } catch (err) {
        let errorResponse = Response.errorResponse(err, req.user.language);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get("/notes/count", auth.checkRoles("auditlogs_view"), async(req,res) => {
    try {
        let result = await Notes.count({});
        res.json(Response.successResponse(result));
    } catch (err) {
        let errorResponse = Response.errorResponse(err, req.user.language);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get("/perfumes/count", auth.checkRoles("auditlogs_view"), async(req,res) => {
    try {
        let result = await Perfumes.count({});
        res.json(Response.successResponse(result));
    } catch (err) {
        let errorResponse = Response.errorResponse(err, req.user.language);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get("/topics/count", auth.checkRoles("auditlogs_view"), async(req,res) => {
    try {
        let result = await Topics.count({});
        res.json(Response.successResponse(result));
    } catch (err) {
        let errorResponse = Response.errorResponse(err, req.user.language);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get("/users/count_active", auth.checkRoles("auditlogs_view"), async(req, res) => {
    try {
        let result = await Users.count({is_active: true});
        res.json(Response.successResponse(result));
    } catch (err) {
        let errorResponse = Response.errorResponse(err, req.user.language);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get("/users/count_total", auth.checkRoles("auditlogs_view"), async(req, res) => {
    try {
        let result = await Users.count({});
        res.json(Response.successResponse(result));
    } catch (err) {
        let errorResponse = Response.errorResponse(err, req.user.language);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get("/users/count_banned", auth.checkRoles("auditlogs_view"), async(req, res) => {
    try {
        let result = await Users.count({is_active : false});
        res.json(Response.successResponse(result));
    } catch (err) {
        let errorResponse = Response.errorResponse(err, req.user.language);
        res.status(errorResponse.code).json(errorResponse);
    }
});

module.exports = router;