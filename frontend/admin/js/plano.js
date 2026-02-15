(function(){
  if(sessionStorage.getItem("vj_admin_logged") !== "1"){
    window.location.href = "./login.html";
  }
})();
