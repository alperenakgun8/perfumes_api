const express = require('express');
const router = express.Router();

const Roles = require("../db/models/Roles");
const RolePrivileges = require("../db/models/RolePrivileges");

const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');

const AuditLogs = require('../lib/AuditLogs');
const logger = require("../lib/logger/LoggerClass");

const role_privileges = require("../config/role_privileges"); 

const auth = require("../lib/auth")();
const config = require('../config');
const I18n = require("../lib/i18n");
const UserRoles = require('../db/models/UserRoles');
const i18n = new I18n(config.DEFAULT_LANG);

router.all("*", auth.authenticate(), (req, res, next) => {
    next();
});

router.get("/", auth.checkRoles("role_view"), async (req, res) => {
    try {
        const roles = await Roles.find({}).lean();

        for (let i = 0; i < roles.length; i++) {
            let permissions = await RolePrivileges.find({role_id: roles[i]._id});
            roles[i].permissions = permissions;
        }

        res.json(Response.successResponse(roles));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post("/add", auth.checkRoles("role_add"), async (req, res) => {
    try {
        let body = req.body;

        if(!body.role_name) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["role_name"]));
        }

        if(!body.permissions || !Array.isArray(body.permissions) || body.permissions.length === 0) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.MUST_BE_NON_EMPTY_ARRAY", req.user.language, ["permissions"]));
        }

        let newRole = new Roles({
            role_name: body.role_name,
            created_by: req.user?.id
        });

        const role = await newRole.save();

        for(let i = 0; i<body.permissions.length; i++) {
            let priv = new RolePrivileges({
                role_id: role._id,
                permission: body.permissions[i]
            });

            await priv.save();
        }

        AuditLogs.info(req.user?.email, "Roles", "Add", role);
        logger.info(req.user?.email, "Roles", "Add", role);

        res.json(Response.successResponse({success: true, data: role }));

    } catch (err) {
        logger.error(req.user?.email, "Roles", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post("/update", auth.checkRoles("role_update"), async (req, res) => {
    try {
        let body = req.body;

        if(!body._id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["_id"]));
        }

        let userRole = await UserRoles.findOne({user_id: req.user._id, role_id: body._id});

        if(userRole) {
            throw new CustomError(Enum.HTTP_CODES.FORBIDDEN, i18n.translate("COMMON.NEED_PERMISSIONS", req.user.language), i18n.translate("COMMON.NEED_PERMISSIONS", req.user.language, ["_id"]));
        }

        let updates = {}

        if(body.created_by) {
            throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE,i18n.translate("COMMON.NOT_ACCEPTABLE", req.user.language), i18n.translate("COMMON.NOT_MODIFIABLE", req.user.language, ["created_by"]));
        }

        if(body.role_name) {
            updates.role_name = body.role_name;
        }

        if(body.permissions && Array.isArray(body.permissions) && body.permissions.length > 0) {

            let permissions = await RolePrivileges.find({role_id: body._id});

            let removePermissions = permissions.filter(p => !body.permissions.includes(p.permission));

            let newPermissions = body.permissions.filter(p => !permissions.map(x => x.permission).includes(p));

            if(removePermissions.length > 0) {
                await RolePrivileges.deleteMany({_id: {$in: removePermissions.map(rp => rp._id)}});
            }

            if(newPermissions.length > 0) {
                for(let i = 0; i<newPermissions.length; i++) {
                    let priv = new RolePrivileges({
                        role_id: body._id,
                        permission: newPermissions[i]
                    });

                    await priv.save();
                }
            }
        }

        const updated = await Roles.findByIdAndUpdate(body._id, updates, {new: true});

        if (!updated) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND", req.user.language, ["Role"]));
        }

        AuditLogs.info(req.user?.email, "Roles", "Update", updated);
        logger.info(req.user?.email, "Roles", "Update", updated);

        res.json(Response.successResponse({success: true, data: updated }));

    } catch (err) {
        logger.error(req.user?.email, "Roles", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.delete(`/:id`, auth.checkRoles("role_delete"), async (req, res) => {
    try {
        const roleId = req.params.id.trim();
        const deleted = await Roles.deleteOne({_id: roleId});

        if(deleted.deletedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND_OR_ALREADY_DELETED", req.user.language, ["Role"]));
        }

        await RolePrivileges.deleteMany({role_id: roleId});

        AuditLogs.info(req.user?.email, "Roles", "Delete", deleted);
        logger.info(req.user?.email, "Roles", "Delete", deleted);

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user?.email, "Roles", "Delete", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.get("/role_privileges", auth.checkRoles("role_privileges"), async (req, res) => {
    res.json(role_privileges);
});

module.exports = router;
