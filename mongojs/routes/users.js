var express = require('express');
var router = express.Router();
var mongojs = require('mongojs');
var db = mongojs('workshopdb', ['users']);

/* GET users listing. */
router.get('/', function(req, res, next) {
  var user1 = req.session.user || null;
  var roleToFilter = "user"; // Este es el rol que quieres filtrar, puedes cambiarlo según sea necesario
  db.users.find({role: roleToFilter}, function(err, users) {
    if (err || !users)
        res.send('Error retrieving users.');
    else
        res.render('users', {
            title: 'List of users:',
            users: users,
            user: user1
        });
  });

});

module.exports = router;
