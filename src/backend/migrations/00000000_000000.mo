import Map "mo:core/Map";
import AccessControl "mo:caffeineai-authorization/access-control";

module {
  type CauseId = Nat;
  type DonationId = Nat;

  type CauseStatus = {
    #draft;
    #published;
    #closed;
  };

  type Cause = {
    id : CauseId;
    title : Text;
    description : Text;
    imageRef : Text;
    goalCents : Nat;
    raisedCents : Nat;
    status : CauseStatus;
    createdAt : Int;
  };

  type DonationStatus = {
    #pending;
    #completed;
    #failed;
  };

  type Donation = {
    id : DonationId;
    causeId : CauseId;
    amountCents : Nat;
    donorName : ?Text;
    message : ?Text;
    receiptRef : Text;
    status : DonationStatus;
    createdAt : Int;
  };

  type StripeConfiguration = {
    secretKey : Text;
    allowedCountries : [Text];
  };

  type StripeState = {
    var configuration : ?StripeConfiguration;
  };

  public type OldActor = {};

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    stripeState : StripeState;
    causes : Map.Map<CauseId, Cause>;
    donations : Map.Map<DonationId, Donation>;
    state : { var nextCauseId : Nat; var nextDonationId : Nat };
  };

  public func migration(_ : OldActor) : NewActor {
    let causes = Map.empty<CauseId, Cause>();
    causes.add(
      0,
      {
        id = 0;
        title = "Nepal earthquake relief";
        description = "Help families in Nepal who lost their homes and relatives in the earthquake. Your donation provides emergency shelter, food, clean water and medical care for survivors.";
        imageRef = "/assets/generated/hero-nepal-rebuild.dim_1200x900.jpg";
        goalCents = 50_000_00;
        raisedCents = 0;
        status = #published;
        createdAt = 0;
      },
    );
    causes.add(
      1,
      {
        id = 1;
        title = "Africa water, food and medicine";
        description = "Bring clean drinking water, food and essential medicine to communities across Africa facing drought and disease. Every contribution delivers life-saving supplies.";
        imageRef = "/assets/generated/cause-africa-water.dim_1200x800.jpg";
        goalCents = 75_000_00;
        raisedCents = 0;
        status = #published;
        createdAt = 0;
      },
    );
    {
      accessControlState = AccessControl.initState();
      stripeState = { var configuration = null };
      causes;
      donations = Map.empty();
      state = { var nextCauseId = 2; var nextDonationId = 0 };
    };
  };
};
