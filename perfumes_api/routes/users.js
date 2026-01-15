const express = require('express');
const router = express.Router();

const path = require("path");
const jwt = require("jwt-simple");
const validator = require("validator");
const bcrypt = require("bcrypt-nodejs");

const AuditLogs = require('../lib/AuditLogs');
const Users = require('../db/models/Users');
const UserRoles = require('../db/models/UserRoles');
const Roles = require('../db/models/Roles');

const CustomError = require('../lib/Error');
const Response = require('../lib/Response');

const Enum = require('../config/enum');
const logger = require("../lib/logger/LoggerClass");
const config = require('../config');
const emitter = require("../lib/Emitter");

const auth = require("../lib/auth")();
const I18n = require("../lib/i18n");
const i18n = new I18n(config.DEFAULT_LANG);

const ExcelExport = require("../lib/Export");
const fs = require("fs");

const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	//standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
	// store: ... , // Redis, Memcached, etc. See below.
  store: new MongoStore({
    uri: config.CONNECTION_STRING,
    collectionName: "rateLimits",
    expireTimeMs: 15 * 60 * 1000
  }),
});

const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, next) => {
    next(null, config.FILE_UPLOAD_PATH);
  },
  filename: (req, file, next) => {
    next(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage }).single("profile_picture");

router.post("/auth", limiter, async (req, res) => {
  try {

    let {email, password} = req.body;

    Users.validateFieldsBeforeAuth(email, password);

    let user = await Users.findOne({email: email}).select("+password");

    const lang = req.user?.language || config.DEFAULT_LANG;

    if(!user) {
      throw new CustomError(Enum.HTTP_CODES.UNAUTHORIZED, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", lang), i18n.translate("USER.EMAIL_OR_PASSWORD_WRONG", lang));
    }
    
    if(!user.validPassword(password)) {
      throw new CustomError(Enum.HTTP_CODES.UNAUTHORIZED, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", lang), i18n.translate("USER.EMAIL_OR_PASSWORD_WRONG",lang));
    }

    let payload = {
      id: user._id,
      exp: parseInt(Date.now() / 1000) + config.JWT.EXPIRE_TIME
    }

    let token = jwt.encode(payload, config.JWT.SECRET);

    const role = await UserRoles.findOne({user_id: user._id}).populate("role_id", "role_name").select("role_id");

    const roleName = role.role_id.role_name;
 
    userData = {
      _id: user._id,
      email,
      first_name: user.first_name,
      last_name: user.last_name,
      nickname: user.nickname,
      profile_picture: user.profile_picture,
      language: user.language,
      role: roleName
    }

    AuditLogs.info(email, "Users", "Auth", "authenticated");
    logger.info(email, "Users", "Auth", "authenticated");
    emitter.getEmitter("notifications").emit("messages", {message: "user authenticated."});

    res.json(Response.successResponse({token, user: userData}));

  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post('/add', async (req, res) => {
    try{
        let body = req.body;
        const lang = req.user?.language || config.DEFAULT_LANG;

        if(!body.email || body.email.length === 0) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", lang), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["email"]));
        }

        if(!validator.isEmail(body.email)) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", lang), i18n.translate("USER.EMAIL_FORMAT_ERROR", lang));
        }

        if(!body.password || body.password.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", lang), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["password"]));
        }

        if(body.password.length < Enum.MIN_PASSWORD_LENGTH || body.password.length > Enum.MAX_PASSWORD_LENGTH) {
          throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, i18n.translate("COMMON.NOT_ACCEPTABLE",lang), i18n.translate("USER.PASSWORD_LENGTH", lang));
        }

        if(!body.first_name || body.first_name.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", lang), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["first_name"]));
        }

        if(!body.last_name || body.last_name.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", lang), i18n.translate("COMMON.FIELD_MUST_BE_FILLED",lang, ["last_name"]));
        }

        if(!body.nickname || body.nickname.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST",lang), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["nickname"]));
        }

        let finded = await Users.find({email: body.email});

        if(finded.length > 0) {
            throw new CustomError(Enum.HTTP_CODES.CONFLICT, i18n.translate("COMMON.ALREADY_EXIST", lang, [""]), i18n.translate("COMMON.ALREADY_EXIST", lang, ["User"]));
        }

        let hashedPassword = bcrypt.hashSync(body.password, bcrypt.genSaltSync(8), null);

        let user = new Users({
            email: body.email,
            password: hashedPassword,
            first_name: body.first_name,
            last_name: body.last_name,
            nickname: body.nickname,
            ...(body.language && { language: body.language })
        });

        await user.save();

        const defaultRole = await Roles.findOne({ role_name: "USER"});
        
        if (!defaultRole) {
          await Users.deleteOne({_id: user._id});
          throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", lang, [""]), i18n.translate("COMMON.NOT_FOUND", lang, ["Role"]));
        }

        let userRole = new UserRoles({
          user_id: user._id,
          role_id: defaultRole._id
        });
        await userRole.save();

        AuditLogs.info(user.email, "Users", "Add", user);
        logger.info(user.email, "Users", "Add", user);
        emitter.getEmitter("notifications").emit("messages", {message: "user added."});

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user?.email, "Users", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/register', async (req, res) => {
    
    let body = req.body;  
    try{
        const userExist = await Users.findOne({});

        if(userExist) {
          return res.sendStatus(Enum.HTTP_CODES.NOT_FOUND);
        }
        const lang = req.user?.language || config.DEFAULT_LANG;

        if(!body.email || body.email.length === 0) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", lang), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["email"]));
        }

        if(!validator.isEmail(body.email)) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", lang), i18n.translate("USER.EMAIL_FORMAT_ERROR", lang));
        }

        if(!body.password || body.password.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", lang), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["password"]));
        }

        if(body.password.length < Enum.MIN_PASSWORD_LENGTH || body.password.length > Enum.MAX_PASSWORD_LENGTH) {
          throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, i18n.translate("COMMON.NOT_ACCEPTABLE", lang), i18n.translate("USER.PASSWORD_LENGTH", lang));
        }

        if(!body.first_name || body.first_name.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", lang), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["first_name"]));
        }

        if(!body.last_name || body.last_name.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", lang), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["last_name"]));
        }

        if(!body.nickname || body.nickname.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", lang), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["nickname"]));
        }
         
        let finded = await Users.find({email: body.email});

        if(finded.length > 0) {
            throw new CustomError(Enum.HTTP_CODES.CONFLICT, i18n.translate("COMMON.ALREADY_EXIST", lang, [""]), i18n.translate("COMMON.ALREADY_EXIST", lang, ["User"]));
        }

        let hashedPassword = bcrypt.hashSync(body.password, bcrypt.genSaltSync(8), null);

        let user = new Users({
            email: body.email,
            password: hashedPassword,
            first_name: body.first_name,
            last_name: body.last_name,
            nickname: body.nickname,
            ...(body.language && { language: body.language })
        });
        await user.save();

        let firstRole = await Roles.findOne({role_name: "SUPER_ADMIN"});

        if (!firstRole) {
          await Users.deleteOne({_id: user._id});
          throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", lang, [""]), i18n.translate("COMMON.NOT_FOUND", lang, ["Role"]));
        }

        let userRoles = new UserRoles({
          role_id: firstRole._id,
          user_id: user._id
        });
        await userRoles.save();

        AuditLogs.info(user.email, "Users", "Register", user);
        logger.info(user.email, "Users", "Register", user);
        emitter.getEmitter("notifications").emit("messages", {message: "user registered."});

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(body.email, "Users", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.all("*", auth.authenticate(), (req, res, next) => {
    next();
});

router.get("/auth/me", async (req,res) => {
  try {
    const user = await Users.findById(req.user._id);
    if(!user) {
      return res.status(Enum.HTTP_CODES.NOT_FOUND).json(Response.errorResponse({code: Enum.HTTP_CODES.NOT_FOUND, message: i18n.translate("COMMON.NOT_FOUND", req.user.language, ["User"])}));
    }

    const role = await UserRoles.findOne({user_id: user._id}).populate("role_id", "role_name").select("role_id");

    const roleName = role.role_id.role_name;
 
    userData = {
      _id: user._id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      nickname: user.nickname,
      profile_picture: user.profile_picture,
      language: user.language,
      role: roleName
    }

    res.json(Response.successResponse(userData));
  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
}); 

router.get('/', /*auth.checkRoles("user_view"),*/ async (req, res) => {
    try{
        let users = await Users.find({}).lean();

        for(let i = 0; i < users.length; i++) {
          let roles = await UserRoles.find({user_id: users[i]._id}).populate("role_id");
          users[i].roles = roles;
        }

        res.json(Response.successResponse(users));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get('/profile_info', auth.checkRoles("user_get"), async (req, res) => {
  try{

    let user = await Users.findOne({_id: req.user._id});

    if(!user) {
      return res.status(Enum.HTTP_CODES.NOT_FOUND).json(Response.errorResponse({code: Enum.HTTP_CODES.NOT_FOUND, message: i18n.translate("COMMON.NOT_FOUND", req.user.language, ["User"])}));
    }

    res.json(Response.successResponse(user));
    
  } catch(err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
  }
});

router.post('/update', auth.checkRoles("user_update"), async (req, res) => {
    try{

        let body = req.body;

        let before = await Users.findById(req.user._id);

        if(!before) {
          throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND", req.user.language, ["User"]));
        }

        if(body.email) {
          throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE,i18n.translate("COMMON.NOT_ACCEPTABLE", req.user.language), i18n.translate("COMMON.NOT_MODIFIABLE", req.user.language, ["email"]));
        }

        let updates = {};

        if(body.first_name) {
          updates.first_name = body.first_name;
        }

        if(body.last_name) {
          updates.last_name = body.last_name;
        }

        if(body.nickname) {
          updates.nickname = body.nickname;
        }

        if(body.language) {
          updates.language = body.language;
        }

        if(body._id.toString() === req.user._id.toString()) {
          body.roles = null;
          body.is_active = null;
        }

        if(body.is_active) {
          updates.is_active = body.is_active;
        }

        if(body.roles && Array.isArray(body.roles) && body.roles.length > 0 ) {
          let userRoles = await UserRoles.find({ user_id: req.user._id });

          let removedRoles = userRoles.filter(x => !body.roles.includes(x.role_id));
          let newRoles = body.roles.filter(x => !userRoles.map(ur => ur.role_id).includes(x));

          if(removedRoles.length > 0) {
            await UserRoles.deleteMany({_id: {$in: removedRoles.map(r => r._id.toString())}});
          }

          if(newRoles.length > 0) {
            for(let i = 0; i < newRoles.length; i++) {
              let userRole = new UserRoles({
                user_id: req.user._id,
                role_id: newRoles[i]
              });
              await userRole.save();
            }
          }
        }

        const updated = await Users.findByIdAndUpdate(req.user._id, updates, {new: true});

        AuditLogs.info(updated.email, "Users", "Update", {before: before, after: updated});
        logger.info(updated.email, "Users", "Update", {before: before, after: updated});
        emitter.getEmitter("notifications").emit("messages", {message: "user updated."});

        res.json(Response.successResponse({success: true, data: updated}));

    } catch (err) {
        logger.error(req.user.email, "Users", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/update_password', auth.checkRoles("user_update_password"), async (req, res) => {
  try{

    const{ old_password, new_password } = req.body;
    
    if(!old_password) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["old_password"]));
    }
    if(!new_password){
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["new_password"]));
    }

    let user = await Users.findById(req.user._id).select("+password");
    if (!user) {
      return res.json(Response.successResponse({ success: false, message: i18n.translate("COMMON.NOT_FOUND", req.user.language, ["User"]) }));
    }

    bcrypt.compare(old_password, user.password, async (err, result) => {
      if (err) throw err;

      if(!result) {
        return res.json(Response.successResponse({success: false, message: i18n.translate("USER.OLD_PASSWORD_WRONG", req.user.language)}));
      }

       if(new_password.length < Enum.MIN_PASSWORD_LENGTH || new_password.length > Enum.MAX_PASSWORD_LENGTH) {
      return res.json(Response.successResponse({ success: false, message: i18n.translate("USER.PASSWORD_LENGTH", req.user.language)}));
    }

    let hashedNewPassword = bcrypt.hashSync(new_password, bcrypt.genSaltSync(8), null);

    user.password = hashedNewPassword
    await user.save();

    user = user.toObject();
    delete user.password;

    AuditLogs.info(user.email, "Users", "Password Change", "password changed");
    logger.info(user.email, "Users", "Password Change", "password changed");

    return res.json(Response.successResponse({ success: true, message: "Password updated successfully"}));
    });

  } catch (err) {
    logger.error(req.user.email, "Users", "Password Change", err);
    const errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
  }
});

router.delete('/:id', auth.checkRoles("user_delete"), async (req, res) => {
    try{

        const userId = req.params.id;
        const user = await Users.findById(userId); 

        if(!user) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND_OR_ALREADY_DELETED", req.user.language, ["User"]));
        }

        await Users.deleteOne({_id: userId});

        await UserRoles.deleteMany({ user_id: userId });

        AuditLogs.info(req.user.email, "Users", "Delete", user);
        logger.info(req.user.email, "Users", "Delete", user);
        emitter.getEmitter("notifications").emit("messages", {message: "user deleted."});

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user.email, "Users", "Delete", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post("/upload_profile_picture", auth.checkRoles("user_update_profile_picture"), upload, async(req, res) => {
  try {

    if(!req.file) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["file"]));
    }
    
    const imagePath = `/uploads/${req.file.filename}`;

    const user = await Users.findByIdAndUpdate(
      req.user._id,
      { profile_picture: imagePath},
      { new: true }
    );

    if(!user) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND", req.user.language, ["User"]));
    }

    AuditLogs.info(req.user.email, "Users", "Upload Profile Picture", imagePath);
    logger.info(req.user.email, "Users", "Upload Profile Picture", imagePath);

    res.json(Response.successResponse({ success: true, data: user }));

  } catch (err) {
    logger.error(req.user.email, "Users", "UploadProfilePicture", err);
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
  }
});

router.get("/export", auth.checkRoles("user_export"), async (req, res) => {
    try{
        let users = await Users.find({});

        let excelTable = ExcelExport.toExcel(
        ["EMAIL", "FIRST_NAME", "LAST_NAME", "NICKNAME", "LANGUAGE", "IS_ACTIVE", "CREATED_AT", "PROFILE_PICTURE"],
        ["email", "first_name", "last_name", "nickname", "language", "is_active", "created_at", "profile_picture"],
        users
        );

        let filePath = path.join(config.EXCEL_TMP_PATH, `users_excel_${Date.now()}.xlsx`);
        
        fs.writeFileSync(filePath, excelTable, "UTF-8");
        res.download(filePath, () => {
            fs.unlinkSync(filePath);
        });

        AuditLogs.info(req.user.email, "Users", "Export Excel", "exported");
        logger.info(req.user.email, "Users", "Export Excel", "exported");
        emitter.getEmitter("notifications").emit("messages", {message: "user exported."});

    } catch (err) {
        logger.error(req.user.email, "Users", "Export Excel", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;
