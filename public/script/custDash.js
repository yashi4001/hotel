$("button").click(function() {
    $('html,body').animate({
        scrollTop: $(".book-status").offset().top},
        'slow');
});