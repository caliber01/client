'use strict';
/* global SigningKeys */
/* jshint camelcase: false */

angular.module('stellarClient').controller('RegistrationCtrl', function(
  $rootScope,
  $scope,
  $state,
  $stateParams,
  $timeout,
  $http,
  $q,
  $analytics,
  session,
  debounce,
  singletonPromise,
  usernameProof,
  Wallet,
  FlashMessages,
  invites,
  stellarApi) {

  // Provide a default value to protect against stale config files.
  Options.MAX_WALLET_ATTEMPTS = Options.MAX_WALLET_ATTEMPTS || 3;

  $scope.data = {
    username:             '',
    password:             '',
    passwordConfirmation: '',
    secret:               ''
  };

  session.put('inviteCode', $stateParams.inviteCode);

  $scope.status = {
    usernameAvailable:    null,
    passwordValid:        null,
    passwordConfirmValid: null,
    secretValid:          null
  };

  $scope.errors = {
    usernameErrors:        [],
    passwordErrors:        [],
    passwordConfirmErrors: [],
    secretErrors:          []
  };

  // Don't remove, validator's are injected from other controllers
  $scope.validators = [];
  $scope.showSecretInput = false;

  if(window.analytics && window.analytics.reset) {
    window.analytics.reset();
  }

  // Checks to see if the supplied username is available.
  // This function is debounced to prevent API calls before the user is finished typing.
  var checkUsername = debounce(function(){
    if ($scope.data.username === '') {
      $scope.status.usernameAvailable = null;
    } else {
      var error = getUsernameError($scope.data.username);
      if (error) {
        $scope.errors.usernameErrors.push(error);
        $scope.status.usernameAvailable = false;
        return;
      }
      stellarApi.User.validateUsername($scope.data.username)
        .success(
        function (response) {
          $scope.status.usernameAvailable = true;
        })
        .error(
        function (response){
          switch(response && response.code) {
            case 'already_taken':
              $scope.errors.usernameErrors.push('This username is taken.');
              $scope.status.usernameAvailable = false;
              break;
            default:
              $scope.errors.usernameErrors.push('An error occurred.');
              $scope.status.usernameAvailable = null;
          }
        });
    }
  }, 2000);

  function getUsernameError(username) {
    if (username.length < 3 || username.length > 20) {
      return "Username must be between 3 and 20 characters";
    }
    if(!username.match(/^[a-zA-Z0-9].*[a-zA-Z0-9]$/)) {
      return "Must start and end with a letter or number.";
    }
    if (!username.match(/^[a-zA-Z0-9]+([._-]+[a-zA-Z0-9]+)*$/)) {
      //return "Must start and end with a letter, and may contain \".\", \"_\", or \"-\"";
      return "Only letters numbers or ._-";
    }
    return null;
  }

  // The following functions validate user input on the fly.
  // This will clear error messages once the input is valid.

  $scope.checkUsername = function() {
    $scope.errors.usernameErrors = [];
    $scope.status.usernameAvailable = null;

    if($scope.data.username !== '') {
      checkUsername();
    }
  };

  // The following functions calculate the classes to be applied to the form.

  $scope.usernameClass = function() {
    if($scope.status.usernameAvailable === null){
      return $scope.data.username !== '' ? 'glyphicon-refresh spin' : 'glyphicon-none';
    } else {
      return $scope.status.usernameAvailable ? 'glyphicon-ok' : 'glyphicon-remove';
    }
  };

  $scope.checkSecret = function() {
    $scope.errors.secretErrors = [];
    $scope.status.secretValid = null;

    if($scope.data.secret !== '') {
      $scope.status.secretValid = checkSecret();
    }
  };

  function checkSecret() {
    var seed = stellar.Base.decode_check(stellar.Base.VER_SEED, $scope.data.secret);
    return !!seed;
  }

  $scope.secretClass = function() {
    if($scope.status.secretValid === null) {
      return 'glyphicon-none';
    } else {
      return $scope.status.secretValid ? 'glyphicon-ok' : 'glyphicon-remove';
    }
  };

  $scope.toggleSecretInput = function() {
    if(!$scope.data.secret) {
      $scope.generateSecret();
    }

    $scope.showSecretInput = !$scope.showSecretInput;
  };

  $scope.generateSecret = function() {
    var signingKeys = new SigningKeys();
    $scope.data.secret = signingKeys.secret;
    $scope.errors.secretErrors = [];
    $scope.status.secretValid = true;
  };


  $scope.attemptRegistration = singletonPromise(function() {
  return $q.when($scope.data)
      .then(validateInput)
      .then(generateSigningKeys)
      .then(submitRegistration)
      .then(createWallet)
      .then(login)
      .then(updateSettings)
      .then(trustHcoin)
      .then(claimInvite)
      .then(function() {
        // Take the user to the dashboard.
        $state.go('dashboard');
      });
  });

  // Validate the input before submitting the registration form.
  // This generates messages that help the user resolve their errors.
  function validateInput(data) {
    // Remove any previous error messages.
    $scope.errors.usernameErrors = [];

    var validInput = true;

    if (!data.username) {
      validInput = false;
      $scope.errors.usernameErrors.push('The username field is required.');
    } else if ($scope.status.usernameAvailable === false) {
      validInput = false;
      $scope.errors.usernameErrors.push('This username is taken.');
    }

    if($scope.data.secret && $scope.status.secretValid === false){
      validInput = false;
      $scope.showSecretInput = true;
      $scope.errors.secretErrors.push('Invalid secret key.');
    }

    $scope.validators.forEach(function(validator){
      validInput = validator() && validInput;
    });

    if (validInput) {
      return $q.when(data);
    } else {
      return $q.reject();
    }
  }

  function generateSigningKeys(data) {
    data.signingKeys = StellarWallet.util.generateKeyPair($scope.data.secret);
    return $q.when(data);
  }

  function submitRegistration(data) {
    var deferred = $q.defer();

    var params = {
      username: data.username,
      address: data.signingKeys.address
    };

    // Submit the registration data to the server.
    $.post(Options.API_SERVER + '/user/register', params)
      .done(function(response) {
        data.authToken = response.data.authToken;
        data.updateToken = response.data.updateToken;
        deferred.resolve(data);
      })
      .fail(function(response) {
        showRegistrationErrors(response);
        deferred.reject();
      });

    return deferred.promise;
  }

  var usernameErrorMessages = {
    'already_taken': 'The username is taken.',
    'invalid': 'Username must start and end with a letter, and may contain ".", "_", or "-"'
  };

  function showRegistrationErrors(response) {
    /* jshint camelcase:false */

    if (response && response.status === "fail") {
      var field;
      switch (response.code) {
        case 'already_taken':
          field = response.data && response.data.field;
          if (field === 'username') {
            $scope.errors.usernameErrors.push(usernameErrorMessages.already_taken);
          }
          break;
        case 'invalid':
          field = response.data && response.data.field;
          if (field === 'username') {
            $scope.errors.usernameErrors.push(usernameErrorMessages.invalid);
          }
          break;
        default:
          // TODO: generic error
      }
    } else {
      $scope.errors.usernameErrors.push('Registration error?');
    }
  }

  function createWallet(data) {
    var deferred = $q.defer();

    var keychainData = {
      authToken: data.authToken,
      updateToken: data.updateToken,
      signingKeys: data.signingKeys
    };

    var mainData = {
      username: data.username,
      server: Options.server
    };

    var proof = usernameProof(data.signingKeys, data.username);

    StellarWallet.createWallet({
      server: Options.WALLET_SERVER+'/v2',
      username: data.username.toLowerCase()+'@'+Options.DEFAULT_FEDERATION_DOMAIN,
      password: data.password,
      publicKey: data.signingKeys.publicKey,
      keychainData: JSON.stringify(keychainData),
      mainData: JSON.stringify(mainData),
      usernameProof: proof
    }).then(function(wallet) {
      data.wallet = new Wallet({
        version: 2,
        id: wallet.getWalletId(),
        key: wallet.getWalletKey(),
        keychainData: wallet.getKeychainData(),
        mainData: wallet.getMainData(),
        walletV2: wallet
      });
      deferred.resolve(data);
    }).catch(function(e) {
      if (e.name === 'UsernameAlreadyTaken') {
        $scope.errors.usernameErrors.push(usernameErrorMessages.already_taken);
      } else if (e.name === 'InvalidUsername') {
        $scope.errors.usernameErrors.push(usernameErrorMessages.invalid);
      } else if (e.name === 'ConnectionError') {
        $scope.errors.usernameErrors.push('Connection error. Please try again later.');
      } else {
        Raven.captureMessage('StellarWallet.createWallet unknown error', {
          extra: {
            error: e
          }
        });
        $scope.errors.usernameErrors.push('Unknown error. Please try again later.');
      }

      // Release username
      $http.post(Options.API_SERVER + "/failedRegistration", {
        username: $scope.data.username,
        updateToken: keychainData.updateToken,
        email: $scope.data.email
      });

      deferred.reject();
      throw e;
    }).finally(function() {
      $scope.$apply();
    });

    return deferred.promise;
  }

  function login(data) {
    window.analytics.alias($scope.data.username);
    // Initialize the session with the new wallet.
    session.login(data.wallet);
    return $q.when(data);
  }

  function updateSettings(data) {
    var wallet = session.get('wallet');
    wallet.set('mainData', 'showRewards', false);
    wallet.set('mainData', 'showTrading', false);
    session.syncWallet('update');
    return $q.when(data);
  }

  function trustHcoin(data) {
    var wallet = session.get('wallet');
    var trustParams = {
      method: "submit",
      params: [
        {
          secret: wallet.keychainData.signingKeys.secret,
          tx_json: {
            TransactionType: 'TrustSet',
            Account: wallet.keychainData.signingKeys.address,
            LimitAmount: {
              currency: 'HCC',
              value: '1e+19',
              issuer: 'gEFV42goaiUaDEs8kZ7ne8Sg1naFYV9Mdt'
            },
            Flags: 131072
          }
        }
      ]
    };

    $.post(Options.TRUST_SERVER, JSON.stringify(trustParams));
    return $q.when(data);
  }

  function claimInvite(data) {
    var inviteCode = session.get('inviteCode');
    $analytics.eventTrack('Account Created', {
      inviteCode: inviteCode,
      type: inviteCode ? 'Invited' : 'Organic'
    });

    if(inviteCode) {
      invites.claim(inviteCode)
        .success(function (response) {
          $rootScope.$broadcast('invite-claimed');
        });
    }
    return $q.when(data);
  }
});
