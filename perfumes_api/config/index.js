module.exports = {
    "PORT": process.env.PORT || 3000,
    "LOG_LEVEL": process.env.LOG_LEVEL || "debug",
    "CONNECTION_STRING": process.env.CONNECTION_STRING || "mongodb://localhost:27017/perfumes_api",
    "JWT": {
        "SECRET": process.env.JWT_SECRET || "ec2MffDA1Mzsae.Y48N30.z3OSyJ0eXAiOiJKV1QiLCJhbGciOiJIt56UzI1NiJ9.eyJpZCI6IjY4ZTQwZOIsırhH439009TMxZTVmNjFl.MDEyt4560ZmZjNjM4zxGkPyHTnwQLmnYdW2HYy785IsImV4cCI6MTc2MDA1MzY4N30.z3OSNIAnyvBOiPuasCJItXyzxGkPyHTnBXLW2HPWj1iJ3jMghg5m0G8P.yHTugfswp1nBX5LWY43ZTQwZOIasssırhHwr45439",
        "EXPIRE_TIME": !isNaN(parseInt(process.env.TOKEN_EXPIRE_TIME)) ? parseInt(process.env.TOKEN_EXPIRE_TIME) : 24*60*60
    },
    "EXCEL_TMP_PATH":process.env.EXCEL_TMP_PATH,
    "FILE_UPLOAD_PATH": process.env.FILE_UPLOAD_PATH,
    "DEFAULT_LANG": process.env.DEFAULT_LANG || "TR"
}