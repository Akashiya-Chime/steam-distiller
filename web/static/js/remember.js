$(function(){
    (function(){
        $(".check").on("click", function(e){    //瑕佺粦瀹氬湪璇nput鎺т欢
            var _checked = $(this).prop("checked");
            if(_checked){
                $(this).siblings(".btn").addClass("on");
            }else {
                $(this).siblings(".btn").removeClass("on");
            }
        });
    })();
});