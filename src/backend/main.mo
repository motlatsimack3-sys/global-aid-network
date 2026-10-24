import Map "mo:core/Map";
import Nat "mo:core/Nat";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Stripe "mo:caffeineai-stripe/stripe";
import MixinStripe "mo:caffeineai-stripe/MixinStripe";
import Expose "mo:caffeineai-oql/Expose";
import MapEntity "mo:caffeineai-oql/MapEntity";
import Entity "mo:caffeineai-oql/Entity";
import RecordValue "mo:caffeineai-oql/RecordValue";
import NatValue "mo:caffeineai-oql/NatValue";
import IntValue "mo:caffeineai-oql/IntValue";
import TextValue "mo:caffeineai-oql/TextValue";
import CauseStatusValue "types/CauseStatusValue";
import DonationStatusValue "types/DonationStatusValue";
import Common "types/common";
import CauseTypes "types/causes";
import DonationTypes "types/donations";
import CausesApi "mixins/causes-api";
import DonationsApi "mixins/donations-api";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);

  let stripeState : Stripe.StripeState;
  include MixinStripe(accessControlState, stripeState);

  let causes : Map.Map<Common.CauseId, CauseTypes.Cause>;
  let donations : Map.Map<Common.DonationId, DonationTypes.Donation>;
  let state : { var nextCauseId : Nat; var nextDonationId : Nat };

  include CausesApi(accessControlState, causes, state);
  include DonationsApi(accessControlState, stripeState, causes, donations, state, transform);

  include Expose({
    entities = [
      causes.toEntity("cause", "Cause", "id")
        .sample({
          id = 0;
          title = "";
          description = "";
          imageRef = "";
          goalCents = 0;
          raisedCents = 0;
          status = #draft;
          createdAt = 0;
        })
        .public_()
        .build(),
      donations.toEntity("donation", "Donation", "id")
        .sample({
          id = 0;
          causeId = 0;
          amountCents = 0;
          donorName = ?"";
          message = ?"";
          receiptRef = "";
          status = #pending;
          createdAt = 0;
        })
        .controllerOnly()
        .build(),
    ];
  });

  include ApiDocMixin();
};
