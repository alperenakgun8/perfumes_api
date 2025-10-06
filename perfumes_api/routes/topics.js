const express = require('express');
const router = express.Router();

const Topics = require("../db/models/Topics");
const AuditLogs = require('../lib/AuditLogs');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');
const logger = require("../lib/logger/LoggerClass");
const auth = require("../lib/auth")();

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
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "Topic not found.");
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
        if(!body.user_id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "user_id field must be filled");
        }
        if(!body.title) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "title field must be filled");
        }
        if(!body.content) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "content field must be filled");
        }

        let topic = new Topics({
            user_id: body.user_id,
            title: body.title,
            content: body.content
        });

        await topic.save();

        AuditLogs.info(req.user?.eamil, "Topics", "Add", topic);
        logger.info(req.user?.email, "Topics", "Add", topic);

        const addedTopic = await topic.populate("user_id");

        res.json(Response.successResponse({success: true, data: addedTopic}));
    } catch (err) {
        logger.error(req.user?.email, "Topics", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post("/update", auth.checkRoles("topic_update"), async(req, res) => {
    let body = req.body;
    try {
        if(!body._id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "_id field must be filled");
        }

        let updates = {};

        if(body.user_id) {
            throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, "Not Acceptable", "user_id cannot be changed");
        }
        if(body.title) {
            updates.title = body.title;
        }
        if(body.content) {
            updates.content = body.content;
        }

       const updated = await Topics.updateOne({_id: body._id}, updates);

       if(updated.matchedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "Topic not found");
        }
        
        const updatedTopic = await Topics.findByIdAndUpdate(body._id, updates, {new: true}).populate("user_id");

        AuditLogs.info(req.user?.email, "Topics", "Update", updated);
        logger.info(req.user?.email, "Topics", "Update", updated);

        res.json(Response.successResponse({success: true, data: updatedTopic}));
    } catch (err) {
        logger.error(req.user?.email, "Topics", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.delete('/:id', auth.checkRoles("topic_delete"), async (req, res) => {
    try{
        let topicId = req.params.id;
        const deleted = await Topics.deleteOne({_id: topicId});

        if(deleted.deletedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "Topic not found or already deleted");
        }

        AuditLogs.info(req.user?.email, "Topics", "Update", deleted);
        logger.info(req.user?.email, "Topics", "Update", deleted);

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user?.email, "Topics", "Delete", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;