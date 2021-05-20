
!(function($) {
  "use strict";
/*  
// Contenido de insectos
  $(window).scroll(function() {
    if ($(this).scrollTop() > 125) {
      $('#start').fadeIn('slow');
    } else {
      $('#start').fadeOut('slow');
    }
  });
*/

  jQuery(document).ready(function () {
      titleCameBack();
  });
  function titleCameBack() {
      jQuery(function () {
          var message = "¡Te echamos de menos!";
          var original;

          jQuery(window).focus(function () {
              if (original) {
                  document.title = original;
              }
          }).blur(function () {
              var title = jQuery('title').text();
              if (title != message) {
                  original = title;
              }
              document.title = message;
          });
      });
  }
  
  
 //Cerrar modal
  $('.cerrarmodal').click(cambiarClase);
 
function cambiarClase()
{
    $("#Modal1").css("display", "none");
}
  
/*
 
//mostrar / ocultar servicios
  $('.show-services').click(showServices);
  $('.show-services-volver').click(showServices);
 
function showServices()
{
    $(".hide-services, .services-item").fadeIn('slow');
    $(".show-services, .s-i-d").css("display", "none");
}
  
$('.hide-services').click(hideServices);
  
function hideServices()
{
    $(".hiddenServices, .hide-services").css("display", "none");
    $(".show-services").fadeIn('slow');
}
 
 $('#S1bg').click(service1); 
  
function service1()
{
    $(".services-item, .hide-services").css("display", "none");
    $(".services-item-1, .show-services").fadeIn('slow');
}
  
$('#S2bg').click(service2); 

function service2()
{
    $(".services-item, .hide-services").css("display", "none");
    $(".services-item-2, .show-services").fadeIn('slow');
}
  
$('#S3bg').click(service3); 
  
function service3()
{
    $(".services-item, .hide-services").css("display", "none");
    $(".services-item-3, .show-services").fadeIn('slow');
}
  
$('#S4bg').click(service4); 
  
function service4()
{
    $(".services-item, .hide-services").css("display", "none");
    $(".services-item-4, .show-services").fadeIn('slow');
}  

$('#S5bg').click(service5); 
  
function service5()
{
    $(".services-item, .hide-services").css("display", "none");
    $(".services-item-5, .show-services").fadeIn('slow');
}  

$('#S6bg').click(service6); 
  
function service6()
{
    $(".services-item, .hide-services").css("display", "none");
    $(".services-item-6, .show-services").fadeIn('slow');
}
  
$('#S7bg').click(service7); 
  
function service7()
{
    $(".services-item, .hide-services").css("display", "none");
    $(".services-item-7, .show-services").fadeIn('slow');
}

$('#S8bg').click(service8); 
  
function service8()
{
    $(".services-item, .hide-services").css("display", "none");
    $(".services-item-8, .show-services").fadeIn('slow');
}  
  
$('#Dshow1').click(ShowDesc1);
  
function ShowDesc1()
{
    $(".Desc1").css("display", "block");
    $(".Desc2").css("display", "none");
    $(".Desc3").css("display", "none");
    $(".Desc4").css("display", "none");
    $(".Desc5").css("display", "none");
}  

$('#Dshow2').click(ShowDesc2);  
  
function ShowDesc2()
{
    $(".Desc1").css("display", "none");
    $(".Desc2").css("display", "block");
    $(".Desc3").css("display", "none");
    $(".Desc4").css("display", "none");
    $(".Desc5").css("display", "none");
}  
  
$('#Dshow3').click(ShowDesc3);  

function ShowDesc3()
{
    $(".Desc1").css("display", "none");
    $(".Desc2").css("display", "none");
    $(".Desc3").css("display", "block");
    $(".Desc4").css("display", "none");
    $(".Desc5").css("display", "none");
}  
  
$('#Dshow4').click(ShowDesc4);   
  
function ShowDesc4()
{
    $(".Desc1").css("display", "none");
    $(".Desc2").css("display", "none");
    $(".Desc3").css("display", "none");
    $(".Desc4").css("display", "block");
    $(".Desc5").css("display", "none");
}  
  
$('#Dshow5').click(ShowDesc5); 
 
function ShowDesc5()
{
    $(".Desc1").css("display", "none");
    $(".Desc2").css("display", "none");
    $(".Desc3").css("display", "none");
    $(".Desc4").css("display", "none");
    $(".Desc5").css("display", "block");
}  

*/
  
/* 
//Cambiar imagen background
function BgSet(ElementId, ThisElementURL)
{
  var element = document.getElementById(ElementId);
  element.style.background = ThisElementURL;
}
*/  
  
  
  
  // Smooth scroll for the navigation menu and links with .scrollto classes
  $(document).on('click', '.nav-menu a, .mobile-nav a, .scrollto', function(e) {
    if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
      e.preventDefault();
      var target = $(this.hash);
      if (target.length) {

        var scrollto = target.offset().top;
        var scrolled = 20;

        if ($('#header').length) {
          scrollto -= $('#header').outerHeight()

          if (!$('#header').hasClass('header-scrolled')) {
            scrollto += scrolled;
          }
        }

        if ($(this).attr("href") == '#header') {
          scrollto = 0;
        }

        $('html, body').animate({
          scrollTop: scrollto
        }, 1500, 'easeInOutExpo');

        if ($(this).parents('.nav-menu, .mobile-nav').length) {
          $('.nav-menu .active, .mobile-nav .active').removeClass('active');
          $(this).closest('li').addClass('active');
        }

        if ($('body').hasClass('mobile-nav-active')) {
          $('body').removeClass('mobile-nav-active');
          $('.mobile-nav-toggle i').toggleClass('icofont-navigation-menu icofont-close');
          $('.mobile-nav-overly').fadeOut();
        }
        return false;
      }
    }
  });
  // Mobile Navigation
  if ($('.nav-menu').length) {
    var $mobile_nav = $('.nav-menu').clone().prop({
      class: 'mobile-nav d-lg-none'
    });
    $('body').append($mobile_nav);
    $('body').prepend('<button type="button" class="mobile-nav-toggle d-lg-none"><i class="icofont-navigation-menu"></i></button>');
    $('body').append('<div class="mobile-nav-overly"></div>');

    $(document).on('click', '.mobile-nav-toggle', function(e) {
      $('body').toggleClass('mobile-nav-active');
      $('.mobile-nav-toggle i').toggleClass('icofont-navigation-menu icofont-close');
      $('.mobile-nav-overly').toggle();
    });

    $(document).on('click', '.mobile-nav .drop-down > a', function(e) {
      e.preventDefault();
      $(this).next().slideToggle(300);
      $(this).parent().toggleClass('active');
    });

    $(document).click(function(e) {
      var container = $(".mobile-nav, .mobile-nav-toggle");
      if (!container.is(e.target) && container.has(e.target).length === 0) {
        if ($('body').hasClass('mobile-nav-active')) {
          $('body').removeClass('mobile-nav-active');
          $('.mobile-nav-toggle i').toggleClass('icofont-navigation-menu icofont-close');
          $('.mobile-nav-overly').fadeOut();
        }
      }
    });
  } else if ($(".mobile-nav, .mobile-nav-toggle").length) {
    $(".mobile-nav, .mobile-nav-toggle").hide();
  }
  
    // Navigation active state on scroll
  var nav_sections = $('section');
  var main_nav = $('.nav-menu, .mobile-nav');

  $(window).on('scroll', function() {
    var cur_pos = $(this).scrollTop() + 200;

    nav_sections.each(function() {
      var top = $(this).offset().top,
        bottom = top + $(this).outerHeight();

      if (cur_pos >= top && cur_pos <= bottom) {
        if (cur_pos <= bottom) {
          main_nav.find('li').removeClass('active');
        }
        main_nav.find('a[href="#' + $(this).attr('id') + '"]').parent('li').addClass('active');
      }
      if (cur_pos < 300) {
        $(".nav-menu ul:first li:first").addClass('active');
      }
    });
  });

  
  
  // Toggle .header-scrolled class to #header when page is scrolled 
  $(window).scroll(function() {
    if ($(this).scrollTop() > 100) {
      $('#header').addClass('header-scrolled');
      $('.back-to-top').fadeIn('slow');
      $('.premio2019').addClass('premio-scrolled');
      $('.icofont-navigation-menu').addClass('nav-scrolled-h');
    } else {
      $('#header').removeClass('header-scrolled');
      $('.back-to-top').fadeOut('slow');
      $('.premio2019').removeClass('premio-scrolled');
      $('.icofont-navigation-menu').removeClass('nav-scrolled-h');
    }
  });

  if ($(window).scrollTop() > 100) {
    $('#header').addClass('header-scrolled');
    $('.back-to-top').fadeIn('slow');
    $('.premio2019').addClass('premio-scrolled');
    $('.icofont-navigation-menu').addClass('nav-scrolled-h');
  }
  // Back to top button
  $('.back-to-top').click(function() {
    $('html, body').animate({
      scrollTop: 0
    }, 1500, 'easeInOutExpo');
    return false;
  });
  // jQuery counterUp
  $('[data-toggle="counter-up"]').counterUp({
    delay: 10,
    time: 1000
  });
  // Skills section
  $('.skills-content').waypoint(function() {
    $('.progress .progress-bar').each(function() {
      $(this).css("width", $(this).attr("aria-valuenow") + '%');
    });
  }, {
    offset: '80%'
  });
  // Testimonials carousel (uses the Owl Carousel library)
  $(".testimonials-carousel").owlCarousel({
    speed: 800,
    autoplay: true,
    autoplayTimeout: 12000,
    autoplaySpeed: 1000,
    autoplayHoverPause: true,
    dots: true,
    loop: true,
    items: 1
  });
  // Porfolio isotope and filter
  $(window).on('load', function() {
    var portfolioIsotope = $('.portfolio-container').isotope({
      itemSelector: '.portfolio-item'
    });

    $('#portfolio-flters li').on('click', function() {
      $("#portfolio-flters li").removeClass('filter-active');
      $(this).addClass('filter-active');

      portfolioIsotope.isotope({
        filter: $(this).data('filter')
      });
    });

    // Initiate venobox (lightbox feature used in portofilo)
    $(document).ready(function() {
      $('.venobox').venobox();
    });
  });

})(jQuery);
//Cambiar src imagen
function SrcSet(ImageId, ThisElementSRC)
{
  var element = document.getElementById(ImageId);
  element.src = ThisElementSRC;
}


$(".owl-carousel").owlCarousel();

var owl = $(".owl-carousel");
owl.owlCarousel();

owl.on("translated.owl.carousel", function (event) {
  $("#IDi").removeClass();
  $("#IDi").addClass($(".owl-item.active > .testimonial-item").attr("class"));
});
