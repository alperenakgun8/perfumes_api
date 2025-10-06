const express = require('express');
const router = express.Router();
const multer = require("multer");
const path = require("path");
const jwt = require("jwt-simple");

const is = require("is_js");
const bcrypt = require("bcrypt-nodejs");

const AuditLogs = require('../lib/AuditLogs');
const Users = require('../db/models/Users');
const UserRoles = require('../db/models/UserRoles');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');
const logger = require("../lib/logger/LoggerClass");
const config = require('../config');
const Roles = require('../db/models/Roles');
const auth = require("../lib/auth")();

router.post("/login", async (req, res) => {
  const {email, password} = req.body;
  try{
    if(!email) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "email field must be filled");
    }
    if(!password){
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "password field must be filled");
    }

    const user = await Users.findOne({email: email}).select("+password");
    if(!user){
      return res.json(Response.successResponse({success: false, message: "User with email not found"}));
    }

    bcrypt.compare(password, user.password, (err, result) => {
      if(err) throw err;

      if(!result) {
        return res.json(Response.successResponse({success: false, message: "invalid password"}));
      }

      const { password: pwd, ...userObj } = user.toObject();
      const isAdmin = user.role === "Admin";
      const isSuperAdmin = user.role === "Super Admin";

      AuditLogs.info(req.user?.email, "Users", "Login", user);
      logger.info(req.user?.email, "Users", "Login", user);

      res.json(Response.successResponse({success: true, data: {user: userObj, is_admin: isAdmin, is_super_admin: isSuperAdmin,  success: true}}));
    });

  } catch (err) {
    logger.error(req.user?.email, "Users", "Login", err);
    const errorResponse = Response.errorResponse(err);
    res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
  }
});

router.post("/auth", async (req, res) => {
  try {

    let {email, password} = req.body;

    Users.validateFieldsBeforeAuth(email, password);

    let user = await Users.findOne({email: email}).select("+password");

    if(!user) {
      throw new CustomError(Enum.HTTP_CODES.UNAUTHORIZED, Enum.VALIDATION_ERROR, "Email or password wrong");
    }
    
    if(!user.validPassword(password)) {
      throw new CustomError(Enum.HTTP_CODES.UNAUTHORIZED, Enum.VALIDATION_ERROR, "Email or password wrong");
    }

    let payload = {
      id: user._id,
      exp: parseInt(Date.now() / 1000) * config.JWT.EXPIRE_TIME
    }

    let token = jwt.encode(payload, config.JWT.SECRET);

    userData = {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      nickname: user.nickname,
      role: user.role
    }

    res.json(Response.successResponse({token, user: userData}));

  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post('/add', async (req, res) => {
    let body = req.body;
    try{
        if(!body.email || body.email.length === 0) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "email field must be filled");
        }

        if(!is.email(body.email)) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "email has to be email format");
        }

        if(!body.password || body.password.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "password field must be filled");
        }

        if(body.password.length < Enum.MIN_PASSWORD_LENGTH || body.password.length > Enum.MAX_PASSWORD_LENGTH) {
          throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, Enum.NOT_ACCEPTABLE_TEXT, "password length has to be between 8-16 characters");
        }

        if(!body.first_name || body.first_name.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "first_name field must be filled");
        }

        if(!body.last_name || body.last_name.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "last_name field must be filled");
        }

        if(!body.nickname || body.nickname.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "nickname field must be filled");
        }
         
        let finded = await Users.find({email: body.email});

        if(finded.length > 0) {
            throw new CustomError(Enum.HTTP_CODES.CONFLICT, Enum.VALIDATION_ERROR, "User already exists");
        }

        if(!body.roles || !Array.isArray(body.roles) || body.roles.length === 0 ) {
          throw new CustomError(Enum.HTTP_CODES.CONFLICT, Enum.VALIDATION_ERROR, "roles field must be an Array");
        }

        let roles = await Roles.find({_id: {$in: body.roles}});

        if(roles.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.CONFLICT, Enum.VALIDATION_ERROR, "roles field must be an Array");
        }

        let hashedPassword = bcrypt.hashSync(body.password, bcrypt.genSaltSync(8), null);

        let user = new Users({
            email: body.email,
            password: hashedPassword,
            first_name: body.first_name,
            last_name: body.last_name,
            nickname: body.nickname
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
    let body = req.body;
    try{

        const userExist = Users.findOne({});

        if(userExist) {
          return res.sendStatus(Enum.HTTP_CODES.NOT_FOUND);
        }

        if(!body.email || body.email.length === 0) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "email field must be filled");
        }

        if(!is.email(body.email)) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "email has to be email format");
        }

        if(!body.password || body.password.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "password field must be filled");
        }

        if(body.password.length < Enum.MIN_PASSWORD_LENGTH || body.password.length > Enum.MAX_PASSWORD_LENGTH) {
          throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, Enum.NOT_ACCEPTABLE_TEXT, "password length has to be between 8-16 characters");
        }

        if(!body.first_name || body.first_name.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "first_name field must be filled");
        }

        if(!body.last_name || body.last_name.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "last_name field must be filled");
        }

        if(!body.nickname || body.nickname.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "nickname field must be filled");
        }
         
        let finded = await Users.find({email: body.email});

        if(finded.length > 0) {
            throw new CustomError(Enum.HTTP_CODES.CONFLICT, Enum.VALIDATION_ERROR, "User already exists");
        }

        let hashedPassword = bcrypt.hashSync(body.password, bcrypt.genSaltSync(8), null);

        let user = new Users({
            email: body.email,
            password: hashedPassword,
            first_name: body.first_name,
            last_name: body.last_name,
            nickname: body.nickname
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
        let users = await Users.find({});
        res.json(Response.successResponse(users));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get('/:id', auth.checkRoles("user_get"), async (req, res) => {
  try{
    const userId = req.params.id;
    let user = await Users.findOne({_id: userId});

    if(!user) {
      return res.status(Enum.HTTP_CODES.NOT_FOUND).json(Response.errorResponse({code: Enum.HTTP_CODES.NOT_FOUND, message: "User not found"}));
    }

    res.json(Response.successResponse(user));
    
  } catch(err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
  }
});

router.post('/update', auth.checkRoles("user_update"), async (req, res) => {
    let body = req.body;
    try{
        if(!body._id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "_id field must be filled");
        }

        let user = await Users.findOne({_id: body._id});

        if(!user) {
          throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "User not found");
        }

        if(body.email) {
          throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, Enum.NOT_ACCEPTABLE_TEXT, "email cannot be changed");
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

        if(body.roles && Array.isArray(body.roles) && body.roles.length > 0 ) {
          let userRoles = await UserRoles.find({ user_id: body._id });

          let removedRoles = userRoles.filter(x => !body.roles.includes(x.role_id));
          let newRoles = body.roles.filter(x => !userRoles.map(ur => ur.role_id).includes(x));

          if(removedRoles.length > 0) {
            await UserRoles.deleteMany({_id: {$in: removedRoles.map(r => r._id.toString())}});
          }

          if(newRoles.length > 0) {
            for(let i = 0; i < newRoles.length; i++) {
              let userRole = new UserRoles({
                user_id: body._id,
                role_id: newRoles[i]
              });
              await userRole.save();
            }
          }
        }

        const updated = await Users.findByIdAndUpdate(body._id, updates, {new: true});

        AuditLogs.info(req.user?.email, "Users", "Update", updated);
        logger.info(req.user?.email, "Users", "Update", updated);

        res.json(Response.successResponse({success: true, data: updated}));

    } catch (err) {
        logger.error(req.user?.email, "Users", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/updatepassword', auth.checkRoles("user_update_password"), async (req, res) => {
  try{
    const{ user_id, old_password, new_password } = req.body;

    if(!user_id) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "user_id field must be filled");
    }
    if(!old_password) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "old_password field must be filled");
    }
    if(!new_password){
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "new_password field must be filled");
    }

    const user = await Users.findById(user_id).select("+password");
    if (!user) {
      return res.json(Response.successResponse({ success: false, message: "User not found" }));
    }

    bcrypt.compare(old_password, user.password, async (err, result) => {
      if (err) throw err;

      if(!result) {
        return res.json(Response.successResponse({success: false, message: "does not matched old_password"}));
      }

       if(new_password.length < Enum.MIN_PASSWORD_LENGTH || new_password.length > Enum.MAX_PASSWORD_LENGTH) {
      return res.json(Response.successResponse({ success: false, message: "password length must be in 8-16"}))
    }

    let hashedNewPassword = bcrypt.hashSync(new_password, bcrypt.genSaltSync(8), null);

    user.password = hashedNewPassword
    await user.save();

    AuditLogs.info(user.email, "Users", "PasswordChange", user.select("-password"));
    logger.info(req.user?.email, "Users", "PasswordChange", user.select("-password"));

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

        if(deleted.deletedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "User not found or already deleted");
        }

        await UserRoles.deleteMany({ user_id: body._id });

        AuditLogs.info(deleted.email, "Users", "Delete", deleted);
        logger.info(req.user?.email, "Users", "Delete", deleted);

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user?.email, "Users", "Delete", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random()* 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post("/uploadProfilePic/:id", auth.checkRoles("user_update_profile_picture"), upload.single("profilePic"), async(req, res) => {
  try {
    const userId = req.params.id;

    if(!req.file) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "file cannot upload");
    }

    console.log("req.params.id:", req.params.id);
    console.log("req.file:", req.file);

    const imagePath = `/uploads/${req.file.filename}`;

    const user = await Users.findByIdAndUpdate(
      userId,
      { profile_picture: imagePath},
      { new: true }
    );

    if(!user) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "user not found");
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
