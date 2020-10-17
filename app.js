const express=require('express');
const mysql = require('mysql');
const bodyParser=require('body-parser')
const cookieParser=require('cookie-parser')
require('dotenv').config();

const app=express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(cookieParser())

// Create connection
const db = mysql.createConnection({
    host     : 'localhost',
    user     : process.env.user,
    password : process.env.password,
    database : 'hotel'
});

// Connect
db.connect((err) => {
    if(err){
        throw err;
    }
    console.log('MySql Connected...');
});


app.get("/",function(request,response){ //home route
    response.sendFile(__dirname+"/views/index.html");
})

app.use("/customer",require("./routes/customer/customer"))//customer route

app.use("/admin",require("./routes/admin/admin"))


app.get("/getinfo",function(request,response){
    let sql = 'select * from sample';
    let query = db.query(sql, (err, results) => {
        if(err) throw err;
        console.log(results);
        response.render("info",{results:results});  
    });
})




app.listen(3000,function(){
    console.log("server is running on port 3000");
})