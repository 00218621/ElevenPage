var express = require('express');
var router = express.Router();
var mongojs = require('mongojs');
var db = mongojs('workshopdb', ['users']);
var bcrypt = require('bcrypt');
var saltRounds = 10; // El coste del procesamiento, 10 es un valor por defecto recomendado

/* GET home page. */
router.get('/', function(req, res, next) {
  // Asegúrate de que 'user' exista en la sesión para evitar errores
  var user = req.session.user || null;
  res.render('index', { title: 'Home', user: user });
});

/* GET login page*/
router.get('/login', function(req, res, next) {
  var user = req.session.user || null;
  res.render('login', { title: 'Sign up', user: user });
});

/* GET register page */
router.get('/register', function(req, res, next) {
  var user = req.session.user || null;
  res.render('register', { title: 'Register', user:user });
});

/* POST login page: Codigo añadido por Juan Gomez */
router.post('/logindata', function(req, res) {
  var query = { username: req.body.username };
  db.users.findOne(query, function(err, user) {
    if (err) {
      res.render('login', { 
        title: 'Sign up',
        error: 'Error al buscar el usuario.',
      });
    } else if (!user) {
      res.render('login', {
        title: 'Sign up',
        error: 'Usuario no encontrado.',
      });
    } else {
      // Comparar la contraseña proporcionada con la almacenada en la base de datos
      bcrypt.compare(req.body.password, user.password, function(err, result) {
        if (result) {
          req.session.user = { id: user._id, username: user.username, role: user.role, 
          address: user.address };
          // Si las contraseñas coinciden
          if(user.role==='admin'){
            res.render('logindata-admin', {
              title: '',
              user: req.session.user
            });
          }      
          else if(user.role==='sysadmin'){
            res.render('logindata-sysadmin', {
              title: '',
              user: req.session.user
            });
          }  
          else 
          {
            res.render('data', {
              title: '',
              user: req.session.user
            });
          }
        } else {
          // Si las contraseñas no coinciden
          res.render('login', {
            title: 'Sign up',
            error: 'invalid username or password',
          });
        }
      });
    }
  });
});



/* POST register page: Codigo añadido por Juan Gomez */
router.post('/registerdata', function(req, res) {
  var user = req.body;
  var user1 = req.session.user || null;
  // Define el rol del usuario aquí. Por defecto, todos los nuevos usuarios podrían ser 'user'
  // Si necesitas lógica más compleja para asignar roles, puedes añadirla aquí
  user.role = 'user'; // Este podría ser 'admin', 'sysadmin', 'user', dependiendo de la lógica que quieras implementar

  function validarContraseña(password) {
    const longitudMinima = 8;
    const tieneNumero = /\d/.test(password);
    const tieneMayuscula = /[A-Z]/.test(password);
    const tieneMinuscula = /[a-z]/.test(password);
    const tieneCaracterEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= longitudMinima && tieneNumero && tieneMayuscula && tieneMinuscula && tieneCaracterEspecial;
  }

   // Verifica si la contraseña cumple con los criterios
   if (!validarContraseña(user.password)) {
    res.render('register', { 
      title: 'Register', 
      error: 'The password does not meet the security criteria.',
      user: req.session.user || null 
    });
    return;
  }
  // Encripta la contraseña antes de guardarla en la base de datos
  bcrypt.hash(user.password, saltRounds, function(err, hash) {
    if (err) {
      // Manejar error de encriptación aquí
      res.render('register', { title: 'Register', error: 'Error encriptando la contraseña.',
    user: user1 });
    } else {
      // Ahora tenemos la contraseña encriptada, reemplaza la contraseña en texto plano con el hash
      user.password = hash;

      // Insertar usuario en la base de datos
      db.users.insert(user, function(err, savedUser) {
        if (err || !savedUser) {
          res.send('The user could not be created');
        } else {
          // Redirigir o renderizar una vista para confirmar la creación del usuario
          res.redirect('login');
        }
      });
    }
  });
});




router.get('/logout', function(req, res) {
  req.session.destroy(function(err) {
    if (err) {
      console.log(err);
      // Opcionalmente, puedes manejar el error de una mejor manera aquí
    } else {
      res.redirect('/login');
    }
  });
});

router.get('/logindata-admin', isAdmin, function(req, res) {
  // Renderizar vista de dashboard para admins
  res.render('logindata-admin', { user: req.session.user });
});

router.get('/logindata-sysadmin', isSysAdmin, function(req, res) {
  // Renderizar vista de dashboard para admins
  res.render('logindata-sysadmin', { user: req.session.user });
});


router.get('/dashboard', function(req, res) {
  // Asegúrate de que el usuario está autenticado para acceder al dashboard
  if(req.session.user){
    res.render('dashboard', { user: req.session.user });
  } else {
    // Si no está autenticado, redirige al login
    res.redirect('/login',{user: req.session.user});
  }
});


router.get('/edit-user/:id', function(req, res) {
  var userId = req.params.id;
  console.log("Editando usuario con ID:", userId);
  db.users.findOne({_id: mongojs.ObjectId(userId)}, function(err, user) {
      if (err) {
          console.error("Error al encontrar el usuario:", err);
          res.send('Error al encontrar el usuario.');
      } else {
          console.log("Usuario encontrado:", user);
          res.render('edit-user', {
              user: user
          });
      }
  });
});



// Ruta para procesar la actualización
router.post('/update-user/:id', function(req, res) {
  var userId = req.params.id;
  db.users.update({_id: mongojs.ObjectId(userId)}, {$set: {
      email: req.body.email,
      username: req.body.username,
      address: req.body.address,
      // Puedes añadir más campos aquí
  }}, {}, function(err, result) {
      if (err) {
          res.send('Error al actualizar el usuario.');
      } else {
          res.redirect('/users'); // Redirige a la lista de usuarios o a otra página
      }
  });
});

router.post('/delete-user/:id', function(req, res) {
  var userId = req.params.id;
  db.users.remove({_id: mongojs.ObjectId(userId)}, function(err, result) {
    if (err) {
      res.send(err);
    } else {
      res.redirect('/users'); // o la página que desees
    }
  });
});


function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.status(403).send('Acceso denegado');
  }
}
function isSysAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'sysadmin') {
    next();
  } else {
    res.status(403).send('Acceso denegado');
  }
}


// GET listing of admin users
router.get('/admin-users', function(req, res, next) {
  var user1 = req.session.user || null;
  var roleToFilter = "admin"; // Cambia a "admin" para filtrar por administradores
  db.users.find({role: roleToFilter}, function(err, users) {
    if (err || !users)
        res.send('Error retrieving admin users.');
    else
        res.render('admin', { // Asegúrate de que la vista 'users' pueda manejar esta lista
            title: 'List of admin:',
            users: users,
            user: user1
        });
  });
});


router.post('/data', function(req, res) {
  var data = [];
  var query = {username: req.body.username, password: req.body.password}
  db.users.findOne(query, function(err, data) {
    if (err || !data)
    {
      res.render('logindata',{ 
      title: '',
      error: 'Invalid username or password.'
      })
    }
    else 

       {
        
        req.session.user = { id: user._id, username: user.username, role: user.role, address: user.address };

        res.render('data', { // TODO: Reutilizar la vista de login y ocultar la seccion del formulario para mostrar la otra
            title: 'Data of user',
            user: req.session.user
                  });
                
                }
  });
});

module.exports = router;
