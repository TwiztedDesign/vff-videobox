var app = angular.module("myApp", []);


app.controller("Ctrl", ['$scope',function($scope){

    $scope.video = {
        src: "Room6091/Streamer2779"
    };

    $scope.video = vff.addTemplate("video", $scope.video);

    vff.onEvent('video', function(data){
        if(data.src){
            document.querySelector('.stream').src = data.src;
        }

    });
}]);


