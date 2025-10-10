const express = require('express');
const router = express.Router();

const emitter = require("../lib/Emitter");
const Topics = require("../db/models/Topics");
const AuditLogs = require('../lib/AuditLogs');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');
const logger = require("../lib/logger/LoggerClass");
const auth = require("../lib/auth")();
const config = require('../config');
const I18n = require("../lib/i18n");
const i18n = new I18n(config.DEFAULT_LANG);

router.get("/", async (req, res) => {
    try {
        let topics = await Topics.find({}).populate("user_id");
        res.json(Response.successResponse(topics));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id
        let topic = await Topics.findOne({_id: id}).populate("user_id");
        if(!topic) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND", req.user.language, ["Topic"]));
        }
        res.json(Response.successResponse(topic));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.all("*", auth.authenticate(), (req, res, next) => {
    next();
});

router.post("/add", auth.checkRoles("topic_add"), async(req, res) => {
    let body = req.body;
    try {
        if(!body.title) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["title_id"]));
        }
        if(!body.content) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["content"]));
        }

        let topic = new Topics({
            user_id: req.user.email,
            title: body.title,
            content: body.content
        });

        await topic.save();

        AuditLogs.info(req.user.eamil, "Topics", "Add", topic);
        logger.info(req.user.email, "Topics", "Add", topic);
        emitter.getEmitter("notifications").emit("messages", {message: topic.name + "named topic added."});

        const addedTopic = await topic.populate("user_id");

        res.json(Response.successResponse({success: true, data: addedTopic}));
    } catch (err) {
        logger.error(req.user.email, "Topics", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post("/update", auth.checkRoles("topic_update"), async(req, res) => {
    let body = req.body;
    try {
        if(!body._id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["_id"]));
        }

        const before = await Topics.findById(body._id);

        if(!before) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND", req.user.language, ["Topic"]));
        }

        let updates = {};

        if(body.title) {
            updates.title = body.title;
        }
        if(body.content) {
            updates.content = body.content;
        }

       const updated = await Topics.findByIdAndUpdate({_id: body._id}, updates, { new: true });

        AuditLogs.info(req.user.email, "Topics", "Update", {before: before, after: updated});
        logger.info(req.user.email, "Topics", "Update", {before: before, after: updated});
        emitter.getEmitter("notifications").emit("messages", {message: topic.name + "named topic updated."});

        const updatedTopic = await Topics.findByIdAndUpdate(body._id, updates, {new: true}).populate("user_id");

        res.json(Response.successResponse({success: true, data: updatedTopic}));
    } catch (err) {
        logger.error(req.user.email, "Topics", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.delete('/:id', auth.checkRoles("topic_delete"), async (req, res) => {
    try{
        let topicId = req.params.id;

        const topic = await Topics.findById(topicId);

        if(!topic) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND_OR_ALREADY_DELETED", req.user.language, ["Topic"]));
        }

        await Topics.deleteOne({_id: topicId});

        AuditLogs.info(req.user.email, "Topics", "Update", topic);
        logger.info(req.user.email, "Topics", "Update", topic);
        emitter.getEmitter("notifications").emit("messages", {message: topic.name + "named topic deleted."});

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user.email, "Topics", "Delete", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;