const express = require('express');
const app = express();

const http = require('http').createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);

// 미들웨어 설정

app.use(express.urlencoded({ extended: true }))   // body parsing 

app.use(express.json());                        // json

app.set('view engine', 'ejs');                  // ejs

app.use(express.static('public'));              // public 폴더의 파일 사용 가능

// MongoDB 연결
const MongoClient = require('mongodb').MongoClient;

var db;
MongoClient.connect('mongodb+srv://admin:123qwe@cluster0.xjzhiwk.mongodb.net/?retryWrites=true&w=majority', { useUnifiedTopology: true },
  function (error, client) {
    if (error) { return console.log(error); };
    db = client.db('bingo');

    // {} 로 저장하는 자료형 - Object
    // db.collection('user_info').insertOne({_id : 'juwon3839', pw : '1234' }, function(error, result){
    //   console.log('저장완료');
    // });

    http.listen(8080, function () {
      console.log('listening on 8080')
    });
  });

// 콜백함수 사용 방법
// function(function(parameter) {})
// = function((parameter) => {})    -- ES6 문법 -- 연동되지 않는 웹이 있을 수도 있다.
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// 회원가입
app.get('/join', function (req, res) {
  res.render('join.ejs');
});

// /add 경로로 post 요청 들어오면 db에 저장
app.post('/add', function (req, res) {


  // // 총 게시물 갯수 가져오기 --> 콜백함수 안에 담으면 순차적인 실행을 보장한다.
  // db.collection('counter').findOne({name : 'numOfUser'}, function(error, result){
  //   console.log(result.totalUser);
  //   let num_of_user = result.totalUser;

  // user_info라는 콜렉션에 데이터를 입력
  db.collection('user_info').insertOne({ id: req.body.id, password: req.body.password }, function (error, result) {
    console.log('저장완료');
    // 에러 체크
    if (error) { console.log(error) };
  })
});

// res.send('전송완료');

// 회원가입 후 로그인창 - 안되노
// res.sendFile(__dirname + '/index.html');



// /list로 GET요청으로 접속하면
// 실제 DB에 저장된 데이터들로 예쁘게 꾸며진 HTML을 보여줌
app.get('/list', function (req, res) {

  // DB에 저장된 user_info 콜렉션의 데이터 꺼내기
  db.collection('user_info').find().toArray(function (error, result) {
    console.log(result);

    // 꺼낸 데이터 ejs 파일에 집어넣기
    res.render('list.ejs', { user_infos: result });
  });

});

app.delete('/delete', function (req, res) {
  console.log(req.body);
  db.collection('user_info').deleteOne({ _id: parseInt(req.body._id) }, function (error, result) {

    console.log('삭제완료');
    res.status(200).send({ message: '성공' });
  });
});


// Session 방식 로그인을 위한 라이브러리
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');
const { render } = require('ejs');

// Session 방식 로그인을 위한 미들웨어
app.use(session({ secret: '비밀코드', resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', function (req, res) {
  res.render('login.ejs');
});

// 로그인 요청      // passport.authenticate('local' 방식으로 검사
app.post('/login', passport.authenticate('local', {
  // 로그인 실패했을 시 아래의 경로로 보낸다.
  failureRedirect: '/fail'
}), function (req, res) {
  // 로그인 성공 시 아래의 경로로 보낸다.
  res.redirect('/mainpage');
});

// /mainpage 경로로 get 요청이 들어올 때마다 checklogin() 실행
app.get('/mainpage', checklogin, function (req, res) {
  db.collection('waitroom').find().toArray(function (error, result) {

    res.render('mainpage.ejs', { user_infos: req.user.result, room_infos : result});
  });
})

// 로그인 했는 지 확인하는 미들웨어
function checklogin(req, res, next) {
  // console.log(req);
  if (req.user) { // req.user - 로그인 후 세션이 있으면 존재하는 값
    next();
  }

  else {         // 값이 없으면 로그인 안한 것
    console.log(req.user);
    res.send('로그인 안했는데요');
  }
}

// local strategy 인증 방식
// 아이디랑 비번 인증하는 세부코드
passport.use(new LocalStrategy({
  usernameField: 'id',        // 사용자가 제출한 아이디가 어디 적혔는지
  passwordField: 'password',  // 사용자가 제출한 비밀번호가 어디 적혔는지
  session: true,              // 세션을 만들 건지
  passReqToCallback: false,   // 아이디 비밀번호 이외에 다른 검사가 필요한지
}, function (입력한아이디, 입력한비번, done) { // done(서버에러, 사용자 DB데이터, 에러메시지)
  // 입력한 아이디 DB에 존재하는지 확인                         틀릴 경우 false 
  db.collection('user_info').findOne({ id: 입력한아이디 }, function (에러, 결과) {
    if (에러) return done(에러)

    // 없는 아이디
    if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })

    // 아이디 비번 다 맞을 때
    if (입력한비번 == 결과.password) {
      return done(null, 결과)
    }
    // 아이디는 맞는데 비번이 틀릴 때
    else {
      return done(null, false, { message: '비번틀렸어요' })
    }
  })
}));

// 아이디 비번 맞으면 세션 만들어 줘야함

// 세션을 저장시키는 코드         결과가 user에 들어감
passport.serializeUser(function (user, done) {
  // user의 id를 이용해서 세션 저장
  // 세션데이터를 만들고 세션의 id 정보를 쿠키로 보냄
  done(null, user.id);
});

// 로그인한 유저의 세션아이디를 바탕으로 개인정보를 DB에서 찾는 역할
passport.deserializeUser(function (input_id, done) {
  // 로그인한 유저의 개인정보를 DB에서 찾는 역할
  // 찾은 데이터를 {}에 넣음
  db.collection('user_info').findOne({ id: input_id }, function (error, result) {
    // console.log(result);
    done(null, { result });
  });
});

app.get('/createroom/:id', function (req, res) {
  db.collection('user_info').findOne({ _id: parseInt(req.params.id) }, function (error, result) {
    if (error) {
      throw error;
      res.status(404).send('없는 데이터');
    }
    // { : } -> ejs로 데이터 보내는 방식
    res.render('createroom.ejs', { user_infos: result })
  });
});

// 상세페이지
// /detail/ + ':' -> 사용자가 /detail 뒤에 아무 문자열나 입력하는 경우를 의미
// -> id는 url의 파라미터
app.get('/detail/:id', function (req, res) {
  // url 파라미터에서 id에 해당하는 값
  db.collection('user_info').findOne({ _id: parseInt(req.params.id) }, function (error, result) {
    if (error) {
      throw error;
      res.status(404).send('없는 데이터');
    }
    // { : } -> ejs로 데이터 보내는 방식
    res.render('detail.ejs', { data: result })
  })

});

// 대기방 퍼블리싱 해야함

// 방 인원수 확인하는 미들웨어
// function check_num_of_people(req, res, next){
//   db.collection('waitroom').findOne({},function(error, result){
//     if (result.num_of_people >= 2){
      
//     }
//   })
// }

// a태그로 들어오는 경우
app.get('/waitroom/:_id', function (req, res) {
  res.render('socket.ejs');
});


app.post('/waitroom/:_id', function (req, res) { 
  // url 파라미터에서 id에 해당하는 값
  db.collection('user_info').findOne({ _id: parseInt(req.params._id) }, function (error, result) {
    if (error) {
      throw error;
    }

    else {
    // DB에 방 페이지 저장
    db.collection('waitroom').insertOne({constructor : result.id, roomname : req.body.roomname, num_of_people : 1});
    // 대기방으로 이동
    res.render('socket.ejs');
    // 대기방은 두 명만 들어올 수 있게
    // db에 인원수 두기
    }
  })

});


// socket 클라이언트, 서버 버전 같아야함
app.get('/socket', function(req, res){
  res.render('socket.ejs');
})

// 이벤트 리스너
io.on('connection', function(socket){
  console.log('유저 접속');

  // 특정 방에만 메시지 보내기 ->  특정 유저에게만 전달
  socket.on('room1-send', function(data){
    io.to('room1').emit('broadcast',data);
  });

  socket.on('joinroom', function(data){
    // 채팅방 넣어 주기
    socket.join('room1');
  })
  
  // 'user-send'라는 이름으로 메시지 보내면 콜백함수에 넣어서 실행
  socket.on('user-send', function(data){
    console.log(data);
    // 서버 -> 유저 broadcast | io.to(socket.id) - 특정 유저에게만 전달
    io.emit('broadcast', data);
  })

})