const express = require('express');
const Enum = require('../config/enum');
const router = express.Router();
const emitter = require("../lib/Emitter");
const auth = require('../lib/auth')();

emitter.addEmitter("notifications");

router.all("*", auth.authenticate(), (req, res, next) => {
    next();
});

router.get("/", auth.checkRoles("auditlogs_view"), async (req, res) => {

    res.writeHead(Enum.HTTP_CODES.OK, {
        "Content-Type": "text/event-stream",
        "Connection": "keep-alive",
        "Cache-Control": "no-cache, no-transform"
    });

    const listener = (data) => {
        res.write("data: " + JSON.stringify(data) + "\n\n");
    };

    emitter.getEmitter("notifications").on("messages", listener);

    req.on("close", () => {
        emitter.getEmitter("notifications").off("messages", listener);
    });
});

module.exports = router;