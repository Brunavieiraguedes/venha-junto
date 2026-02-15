// Dashboard mock
(function(){
  if(sessionStorage.getItem("vj_admin_logged") !== "1"){
    // redireciona para login
    window.location.href = "./login.html";
  }
})();
