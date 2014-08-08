sc.controller('TaskMessageCtrl', function ($scope, $filter, session) {
    $scope.getInvitesLeft = function () {
        return $filter('unsentInviteFilter')(session.getUser().getInvites());
    };

    $scope.inviteTasks = {
        hasInviteCode: {
            getText: function () {
                return "Your friend sent you an invite code.";
            },
            getSubtext: function () {
                return "Enter it and receive your remaining stellars immediately.";
            },
            getButtonText: function () {
                return "Enter code";
            },
            action: function () {
                // TODO: open the facebook pane
            }
        },
        hasNewInvites: {
            getText: function () {
                return "You have received " + $scope.newInvites + " new invites for your friends!";
            },
            getSubtext: function () {
                return "You will receive stellars for every authenticated friend you invite.";
            },
            getButtonText: function () {
                return "Share";
            },
            action: function () {
                // TODO: go to invite pane
            }
        }
    }

    $scope.task = null;

    function loadTasks() {
        var user = session.getUser();
        user.refresh()
            .then(function () {
                if (user.getInviteeCode()) {
                    $scope.task = $scope.inviteTasks['hasInviteCode'];
                } else if (user.getNewInvites().length > 0) {
                    $scope.newInvites = user.getNewInvites().length;
                    $scope.task = $scope.inviteTasks['hasNewInvites'];
                }
            })
    }

    $scope.$on('userLoaded', function () {
        loadTasks();
    });
});