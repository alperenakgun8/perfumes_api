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

const auth = require("../lib/auth")();
const I18n = require("../lib/i18n");
const i18n = new I18n(config.DEFAULT_LANG);

const multer = require("multer");

const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 50, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
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

    const roles = await UserRoles.find({user_id: user._id}).populate("role_id").select("role_name");

    // let role = "USER";

    // for(let i = 0; i < roles.length; i++) {
    //   if(roles[i].role_id.role_name === "SUPER_ADMIN") {
    //     role = "SUPER_ADMIN";
    //     break;
    //   } else if (roles[i].role_id.role_name === "ADMIN") {
    //     role = "ADMIN";
    //   }
    // }
 
    userData = {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      nickname: user.nickname,
      profile_picture: user.profile_picture,
      language: user.language,
      role: roles
    }

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

        if(!body.roles || !Array.isArray(body.roles) || body.roles.length === 0 ) {
          throw new CustomError(Enum.HTTP_CODES.CONFLICT, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", lang), i18n.translate("COMMON.MUST_BE_NON_EMPTY_ARRAY", lang, ["roles"]));
        }

        let roles = await Roles.find({_id: {$in: body.roles}});

        if(roles.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.CONFLICT, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", lang), i18n.translate("COMMON.MUST_BE_NON_EMPTY_ARRAY", lang, ["roles"]));
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

        for(let i = 0; i < roles.length; i++) {
          let userRole = new UserRoles({
            user_id: user._id,
            role_id: roles[i]._id
          });
          await userRole.save();
        }

        AuditLogs.info(req.user?.email, "Users", "Add", user);
        logger.info(req.user?.email, "Users", "Add", user);

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user?.email, "Users", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/register', async (req, res) => {
    try{
        const userExist = await Users.findOne({});

        if(userExist) {
          return res.sendStatus(Enum.HTTP_CODES.NOT_FOUND);
        }

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

        let role = new Roles({
          role_name: "SUPER_ADMIN",
          created_by: user._id
        });
        await role.save();

        let userRoles = new UserRoles({
          role_id: role._id,
          user_id: user._id
        });
        await userRoles.save();

        AuditLogs.info(req.user?.email, "Users", "Add", user);
        logger.info(req.user?.email, "Users", "Add", user);

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user?.email, "Users", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.all("*", auth.authenticate(), (req, res, next) => {
    next();
});

router.get('/', auth.checkRoles("user_view"), async (req, res) => {
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

    let user = await Users.findOne({_id: req.user?._id});
    const lang = req.user?.language || config.DEFAULT_LANG;

    if(!user) {
      return res.status(Enum.HTTP_CODES.NOT_FOUND).json(Response.errorResponse({code: Enum.HTTP_CODES.NOT_FOUND, message: i18n.translate("COMMON.NOT_FOUND", lang, ["User"])}));
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
        const lang = req.user?.language || config.DEFAULT_LANG;

        if(!body._id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", lang), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["_id"]));
        }

        let user = await Users.findOne({_id: req.user?._id});

        if(!user) {
          throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", lang, [""]), i18n.translate("COMMON.NOT_FOUND", lang, ["User"]));
        }

        if(body.email) {
          throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE,i18n.translate("COMMON.NOT_ACCEPTABLE", lang), i18n.translate("COMMON.NOT_MODIFIABLE", lang, ["email"]));
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

        if(body._id == req.user._id) {
          // throw new CustomError(Enum.HTTP_CODES.FORBIDDEN, i18n.translate("COMMON.NEED_PERMISSIONS", lang), i18n.translate("COMMON.NEED_PERMISSIONS", lang));
          body.roles = null;
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

        AuditLogs.info(req.user?.email, "Users", "Update", updated);
        logger.info(req.user?.email, "Users", "Update", updated);

        res.json(Response.successResponse({success: true, data: updated}));

    } catch (err) {
        logger.error(req.user?.email, "Users", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/update_password', auth.checkRoles("user_update_password"), async (req, res) => {
  try{
    const{ old_password, new_password } = req.body;
    const lang = req.user?.language || config.DEFAULT_LANG;

    // if(!user_id) {
    //   throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", lang), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["user_id"]));
    // }
    if(!old_password) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", lang), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["old_password"]));
    }
    if(!new_password){
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", lang), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["new_password"]));
    }

    const user = await Users.findById(req.user?._id).select("+password");
    if (!user) {
      return res.json(Response.successResponse({ success: false, message: i18n.translate("COMMON.NOT_FOUND", lang, ["User"]) }));
    }

    bcrypt.compare(old_password, user.password, async (err, result) => {
      if (err) throw err;

      if(!result) {
        return res.json(Response.successResponse({success: false, message: i18n.translate("USER.OLD_PASSWORD_WRONG", lang)}));
      }

       if(new_password.length < Enum.MIN_PASSWORD_LENGTH || new_password.length > Enum.MAX_PASSWORD_LENGTH) {
      return res.json(Response.successResponse({ success: false, message: i18n.translate("USER.PASSWORD_LENGTH", lang)}));
    }

    let hashedNewPassword = bcrypt.hashSync(new_password, bcrypt.genSaltSync(8), null);

    user.password = hashedNewPassword
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    AuditLogs.info(user.email, "Users", "PasswordChange", safeUser);
    logger.info(req.user?.email, "Users", "PasswordChange", safeUser);

    return res.json(Response.successResponse({ success: true, message: "Password updated successfully"}));
    });

  } catch (err) {
    logger.error(req.user?.email, "Users", "PasswordChange", err);
    const errorResponse = Response.errorResponse(err);
    res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
  }
});

router.delete('/:id', auth.checkRoles("user_delete"), async (req, res) => {
    try{
        const userId = req.params.id; 
        const deleted = await Users.deleteOne({_id: userId});
        const lang = req.user?.language || config.DEFAULT_LANG;

        if(deleted.deletedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", lang, [""]), i18n.translate("COMMON.NOT_FOUND_OR_ALREADY_DELETED", lang, ["User"]));
        }

        await UserRoles.deleteMany({ user_id: userId });

        AuditLogs.info(req.user?.email, "Users", "Delete", deleted);
        logger.info(req.user?.email, "Users", "Delete", deleted);

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user?.email, "Users", "Delete", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post("/upload_profile_picture", auth.checkRoles("user_update_profile_picture"), upload, async(req, res) => {
  try {

    const lang = req.user?.language || config.DEFAULT_LANG;

    if(!req.file) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", lang), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", lang, ["file"]));
    }
    
    const imagePath = `/uploads/${req.file.filename}`;

    const user = await Users.findByIdAndUpdate(
      req.user._id,
      { profile_picture: imagePath},
      { new: true }
    );

    if(!user) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.NOT_FOUND", lang, [""]), i18n.translate("COMMON.NOT_FOUND", lang, ["User"]));
    }

    AuditLogs.info(req.user?.email, "Users", "UploadProfilePicture", imagePath);
    logger.info(req.user?.email, "Users", "UploadProfilePicture", imagePath);

    res.json(Response.successResponse({ success: true, message: "Profile picture updated", data: user }));

  } catch (err) {
    logger.error(req.user?.email, "Users", "UploadProfilePicture", err);
    let errorResponse = Response.errorResponse(err);
    res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
  }
});

module.exports = router;

// router.post("/login", async (req, res) => {
//   const {email, password} = req.body;
//   try{
//     if(!email) {
//       throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "email field must be filled");
//     }
//     if(!password){
//       throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "password field must be filled");
//     }

//     const user = await Users.findOne({email: email}).select("+password");
//     if(!user){
//       return res.json(Response.successResponse({success: false, message: "User with email not found"}));
//     }

//     bcrypt.compare(password, user.password, (err, result) => {
//       if(err) throw err;

//       if(!result) {
//         return res.json(Response.successResponse({success: false, message: "invalid password"}));
//       }

//       const { password: pwd, ...userObj } = user.toObject();
//       const isAdmin = user.role === "Admin";
//       const isSuperAdmin = user.role === "Super Admin";

//       AuditLogs.info(req.user?.email, "Users", "Login", user);
//       logger.info(req.user?.email, "Users", "Login", user);

//       res.json(Response.successResponse({success: true, data: {user: userObj, is_admin: isAdmin, is_super_admin: isSuperAdmin,  success: true}}));
//     });

//   } catch (err) {
//     logger.error(req.user?.email, "Users", "Login", err);
//     const errorResponse = Response.errorResponse(err);
//     res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
//   }
// });
