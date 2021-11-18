import Utils from "./Utils";
import { OWL, a, RDFS, SKOS, ERA, XSD, BASE_URI } from "./NameSpaces";
import { getCurrentLanguage, getPhrase } from "./Languages";

const params = {
  OP: {
    genericInformation: {
      // Path for these params is: OP
      "1.2.0.0.0.4": null, // http://data.europa.eu/949/opType
      "1.2.0.0.0.2": null, // http://data.europa.eu/949/uopid
      "1.2.0.0.0.1": null, // http://data.europa.eu/949/opName
    },
    moreCriteria: {
      // Path for these params is: OP
      "1.2.0.0.0.3": null, // http://data.europa.eu/949/tafTAPCode
      "1.2.0.0.0.4.1": null, // http://data.europa.eu/949/opTypeGaugeChangeover
      "1.2.0.0.0.5": {
        type: "text",
        label: "location",
        comment:
          "Geographical location given as longitude/latitude coordinates.",
        domain: [],
        index: "http://www.w3.org/2003/01/geo/wgs84_pos#location",
      }, // (**SPECIAL CASE** that will need a special query)
      "1.2.0.0.0.6": null, // http://data.europa.eu/949/lineReference (**SPECIAL CASE** that will need a special query)

      runningTrack: {
        domain: "era:track", // Path for these params is: OP -> Track
        genericInformation: {
          "1.2.1.0.0.1": null, // http://data.europa.eu/949/imCode
          "1.2.1.0.0.2": null, // http://data.europa.eu/949/trackId
        },
        declarationsOfVerificationForTrack: {
          "1.2.1.0.1.1": null, // http://data.europa.eu/949/verificationINF
          "1.2.1.0.1.2": null, // http://data.europa.eu/949/demonstrationINF
        },
        performanceParameters: {
          "1.2.1.0.2.1": null, // http://data.europa.eu/949/tenClassification
          "1.2.1.0.2.2": null, // http://data.europa.eu/949/lineCategory
          "1.2.1.0.2.3": null, // http://data.europa.eu/949/freightCorridor
        },
        lineLayout: {
          "1.2.1.0.3.4": null, // http://data.europa.eu/949/gaugingProfile
          "1.2.1.0.3.5": null, // http://data.europa.eu/949/gaugingCheckLocation
          "1.2.1.0.3.6": null, // http://data.europa.eu/949/gaugingTransversalDocument
        },
        trackParameters: {
          "1.2.1.0.4.1": null, // http://data.europa.eu/949/wheelSetGauge
        },
        tunnel: {
          domain: "era:passesThroughTunnel", // Path for these params is: OP -> Track -> Tunnel
          "1.2.1.0.5.1": null, // http://data.europa.eu/949/imCode
          "1.2.1.0.5.2": null, // http://data.europa.eu/949/tunnelIdentification
          "1.2.1.0.5.3": null, // http://data.europa.eu/949/verificationSRT
          "1.2.1.0.5.4": null, // http://data.europa.eu/949/demonstrationSRT
          "1.2.1.0.5.5": null, // http://data.europa.eu/949/length
          "1.2.1.0.5.6": null, // http://data.europa.eu/949/hasEmergencyPlan
          "1.2.1.0.5.7": null, // http://data.europa.eu/949/rollingStockFireCategory
          "1.2.1.0.5.8": null, // http://data.europa.eu/949/nationalRollingStockFireCategory
          "1.2.1.0.5.9": null, // http://data.europa.eu/949/dieselThermalAllowed
        },
        platform: {
          domain: "era:platform", // Path for these params is: OP -> Track -> Platform
          "1.2.1.0.6.1": null, // http://data.europa.eu/949/imCode
          "1.2.1.0.6.2": null, // http://data.europa.eu/949/platformId
          "1.2.1.0.6.3": null, // http://data.europa.eu/949/tenClassification
          "1.2.1.0.6.4": null, // http://data.europa.eu/949/length
          "1.2.1.0.6.5": null, // http://data.europa.eu/949/platformHeight
          "1.2.1.0.6.6": null, // http://data.europa.eu/949/assistanceStartingTrain
          "1.2.1.0.6.7": null, // http://data.europa.eu/949/areaBoardingAid
        },
      },
      siding: {
        domain: "era:siding", // Path for these params is: OP -> Siding
        genericInformation: {
          "1.2.2.0.0.1": null, // http://data.europa.eu/949/imCode
          "1.2.2.0.0.2": null, // http://data.europa.eu/949/sidingId
          "1.2.2.0.0.3": null, // http://data.europa.eu/949/tenClassification
        },
        declarationOfVerificationForSiding: {
          "1.2.2.0.1.1": null, // http://data.europa.eu/949/verificationINF
          "1.2.2.0.1.2": null, // http://data.europa.eu/949/demonstrationINF
        },
        performanceParameters: {
          "1.2.2.0.2.1": null, // http://data.europa.eu/949/length
        },
        lineLayout: {
          "1.2.2.0.3.1": null, // http://data.europa.eu/949/gradient
          "1.2.2.0.3.2": null, // http://data.europa.eu/949/minimumHorizontalRadius
          "1.2.2.0.3.3": null, // http://data.europa.eu/949/minimumVerticalRadius
        },
        fixedInstallationsForServicingTrains: {
          "1.2.2.0.4.1": null, // http://data.europa.eu/949/hasToiletDischarge
          "1.2.2.0.4.2": null, // http://data.europa.eu/949/hasExternalCleaning
          "1.2.2.0.4.3": null, // http://data.europa.eu/949/hasWaterRestocking
          "1.2.2.0.4.4": null, // http://data.europa.eu/949/hasRefuelling
          "1.2.2.0.4.5": null, // http://data.europa.eu/949/hasSandRestocking
          "1.2.2.0.4.6": null, // http://data.europa.eu/949/hasElectricShoreSupply
        },
        tunnel: {
          domain: "era:passesThroughTunnel", // Path for these params is: OP -> Siding -> Tunnel
          "1.2.2.0.5.1": null, // http://data.europa.eu/949/imCode
          "1.2.2.0.5.2": null, // http://data.europa.eu/949/tunnelIdentification
          "1.2.2.0.5.3": null, // http://data.europa.eu/949/verificationSRT
          "1.2.2.0.5.4": null, // http://data.europa.eu/949/demonstrationSRT
          "1.2.2.0.5.6": null, // http://data.europa.eu/949/length
          "1.2.2.0.5.5": null, // http://data.europa.eu/949/hasEmergencyPlan
          "1.2.2.0.5.7": null, // http://data.europa.eu/949/rollingStockFireCategory
          "1.2.2.0.5.8": null, // http://data.europa.eu/949/nationalRollingStockFireCategory
        },
        contactLineSystem: {
          "1.2.2.0.6.1": null, // http://data.europa.eu/949/maxCurrentStandstillPantograph
        },
      },
      rulesAndRestriction: {
        // Path for these params is: OP
        "1.2.3.1": null, // http://data.europa.eu/949/localRulesOrRestrictions
        "1.2.3.2": null, // http://data.europa.eu/949/localRulesOrRestrictionsDoc
      },
    },
  },

  SOL: {
    // memberState,
    genericInformation: {
      // Path for these params is: SOL
      "1.1.0.0.0.1": null, // http://data.europa.eu/949/imCode
      "1.1.0.0.0.2": null, // http://data.europa.eu/949/lineNationalId
      "1.1.0.0.0.5": null, // http://data.europa.eu/949/length
      "1.1.0.0.0.3": null, // http://data.europa.eu/949/opStart
      "1.1.0.0.0.4": null, // http://data.europa.eu/949/opEnd
      "1.1.0.0.0.6": null, // http://data.europa.eu/949/solNature
    },
    moreCriteria: {
      genericInformation: {
        domain: "era:track", // Path for these params is: SOL -> Track
        "1.1.1.0.0.1": null, // http://data.europa.eu/949/trackId
        "1.1.1.0.0.2": null, // http://data.europa.eu/949/trackDirection
      },
      infrastructureSubsystem: {
        declarationsOfVerificationForTrack: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.1.1.1": null, // http://data.europa.eu/949/verificationINF
          "1.1.1.1.1.2": null, // http://data.europa.eu/949/demonstrationINF
        },
        performanceParameters: {
          trackParams: {
            domain: "era:track", // Path for these params is: SOL -> Track
            "1.1.1.1.2.1": null, // http://data.europa.eu/949/tenClassification
            "1.1.1.1.2.1.2": null, // http://data.europa.eu/949/tenGISId
            "1.1.1.1.2.4": null, // http://data.europa.eu/949/loadCapability
            "1.1.1.1.2.4.1": null, // http://data.europa.eu/949/nationalLoadCapability
            "1.1.1.1.2.4.2": null, // http://data.europa.eu/949/highSpeedLoadModelCompliance
            "1.1.1.1.2.4.3": null, // http://data.europa.eu/949/structureCheckLocation
            "1.1.1.1.2.4.4": null, // http://data.europa.eu/949/compatibilityProcedureDocument
            "1.1.1.1.2.5": null, // http://data.europa.eu/949/maximumPermittedSpeed
            "1.1.1.1.2.6": null, // http://data.europa.eu/949/minimumTemperature AND http://data.europa.eu/949/maximumTemperature
            "1.1.1.1.2.7": null, // http://data.europa.eu/949/maximumAltitude
            "1.1.1.1.2.8": null, // http://data.europa.eu/949/hasSevereWeatherConditions
          },
          lineParams: {
            domain: "era:lineNationalId", // The path of these params is: SOL -> NationalRailwayLine
            "1.1.1.1.2.2": null, // http://data.europa.eu/949/lineCategory
            "1.1.1.1.2.3": null, // http://data.europa.eu/949/freightCorridor
          },
        },
        lineLayout: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.1.3.1.1": null, // http://data.europa.eu/949/gaugingProfile
          "1.1.1.1.3.1.2": null, // http://data.europa.eu/949/gaugingCheckLocation
          "1.1.1.1.3.1.3": null, // http://data.europa.eu/949/gaugingTransversalDocument
          "1.1.1.1.3.4": null, // http://data.europa.eu/949/profileNumberSwapBodies
          "1.1.1.1.3.5": null, // http://data.europa.eu/949/profileNumberSemiTrailers
          "1.1.1.1.3.5.1": null, // http://data.europa.eu/949/specificInformation
          "1.1.1.1.3.6": null, // http://data.europa.eu/949/gradientProfile
          "1.1.1.1.3.7": null, // http://data.europa.eu/949/minimumHorizontalRadius
        },
        trackParameters: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.1.4.1": null, // http://data.europa.eu/949/wheelSetGauge
          "1.1.1.1.4.2": null, // http://data.europa.eu/949/cantDeficiency
          "1.1.1.1.4.3": null, // http://data.europa.eu/949/railInclination
          "1.1.1.1.4.4": null, // http://data.europa.eu/949/hasBallast
        },
        switchesAndCrossings: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.1.5.1": null, // http://data.europa.eu/949/tsiSwitchCrossing
          "1.1.1.1.5.2": null, // http://data.europa.eu/949/minimumWheelDiameter
        },
        trackResistanceToAppliedLoads: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.1.6.1": null, // http://data.europa.eu/949/maximumTrainDeceleration
          "1.1.1.1.6.2": null, // http://data.europa.eu/949/eddyCurrentBraking
          "1.1.1.1.6.3": null, // http://data.europa.eu/949/magneticBraking
          "1.1.1.1.6.4": null, // http://data.europa.eu/949/eddyCurrentBrakingConditionsDocument
          "1.1.1.1.6.5": null, // http://data.europa.eu/949/magneticBrakingConditionsDocument
        },
        healthSafetyAndEnvironment: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.1.7.1": null, // http://data.europa.eu/949/flangeLubeForbidden
          "1.1.1.1.7.2": null, // http://data.europa.eu/949/hasLevelCrossings
          "1.1.1.1.7.3": null, // http://data.europa.eu/949/accelerationLevelCrossing
          "1.1.1.1.7.4": null, // http://data.europa.eu/949/hasHotAxleBoxDetector
          "1.1.1.1.7.5": null, // http://data.europa.eu/949/hotAxleBoxDetectorTSICompliant
          "1.1.1.1.7.6": null, // http://data.europa.eu/949/hotAxleBoxDetectorIdentification
          "1.1.1.1.7.7": null, // http://data.europa.eu/949/hotAxleBoxDetectorGeneration
          "1.1.1.1.7.8": null, // http://data.europa.eu/949/hotAxleBoxDetectorLocation
          "1.1.1.1.7.9": null, // http://data.europa.eu/949/hotAxleBoxDetectorDirection
          "1.1.1.1.7.10": null, // http://data.europa.eu/949/redLightsRequired
          "1.1.1.1.7.11": null, // http://data.europa.eu/949/isQuietRoute
        },
        tunnel: {
          domain: "era:track",
          tunnelParams: {
            domain: "era:passesThroughTunnel", // Path for these params is: SOL -> Track -> Tunnel
            "1.1.1.1.8.1": null, // http://data.europa.eu/949/imCode
            "1.1.1.1.8.2": null, // http://data.europa.eu/949/tunnelIdentification
            "1.1.1.1.8.3": null, // http://data.europa.eu/949/startLocation
            "1.1.1.1.8.4": null, // http://data.europa.eu/949/endLocation
            "1.1.1.1.8.5": null, // http://data.europa.eu/949/verificationSRT
            "1.1.1.1.8.6": null, // http://data.europa.eu/949/demonstrationSRT
            "1.1.1.1.8.7": null, // http://data.europa.eu/949/length
            "1.1.1.1.8.8": null, // http://data.europa.eu/949/crossSectionArea
            "1.1.1.1.8.8.1": null, // http://data.europa.eu/949/complianceInfTsi
            "1.1.1.1.8.8.2": null, // http://data.europa.eu/949/tunnelDocRef
            "1.1.1.1.8.9": null, // http://data.europa.eu/949/hasEmergencyPlan
            "1.1.1.1.8.10": null, // http://data.europa.eu/949/rollingStockFireCategory
            "1.1.1.1.8.11": null, // http://data.europa.eu/949/nationalRollingStockFireCategory
          },
        },
      },
      energySubsystem: {
        declarationsOfVerificationForTrack: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.2.1.1": null, // http://data.europa.eu/949/verificationENE
          "1.1.1.2.1.2": null, // http://data.europa.eu/949/demonstrationENE
        },
        contactLineSystem: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.2.2.5": null, // http://data.europa.eu/949/maximumContactWireHeight
          "1.1.1.2.2.6": null, // http://data.europa.eu/949/minimumContactWireHeight
          contactLineSystemParams: {
            domain: "era:contactLineSystem", // Path for these params is: SOL -> Track -> ContactLineSystem
            "1.1.1.2.2.1.1": null, // http://data.europa.eu/949/contactLineSystemType
            "1.1.1.2.2.1.2": null, // http://data.europa.eu/949/energySupplySystem
            "1.1.1.2.2.1.2.1": null, // http://data.europa.eu/949/energySupplySystemTSICompliant
            "1.1.1.2.2.1.3": null, // http://data.europa.eu/949/umax2
            "1.1.1.2.2.2": null, // http://data.europa.eu/949/maxTrainCurrent
            "1.1.1.2.2.3": null, // http://data.europa.eu/949/maxCurrentStandstillPantograph
            "1.1.1.2.2.4": null, // http://data.europa.eu/949/hasRegenerativeBrake
          },
        },
        pantograph: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.2.3.1": null, // http://data.europa.eu/949/pantographHead
          "1.1.1.2.3.2": null, // http://data.europa.eu/949/pantographHead (this is not a mistake, they both use the same property :))
          "1.1.1.2.3.3": null, // http://data.europa.eu/949/raisedPantographsDistanceAndSpeed
          "1.1.1.2.3.4": null, // http://data.europa.eu/949/contactStripMaterial
        },
        oclSeparationSections: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.2.4.1.1": null, // http://data.europa.eu/949/phaseSeparation
          "1.1.1.2.4.1.2": null, // http://data.europa.eu/949/phaseInfo
          "1.1.1.2.4.2.1": null, // http://data.europa.eu/949/hasSystemSeparation
          "1.1.1.2.4.2.2": null, // http://data.europa.eu/949/systemSeparationInfo
          "1.1.1.2.4.3": null, // http://data.europa.eu/949/distSignToPhaseEnd
        },
        requirementsForRollingStock: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.2.5.2": null, // http://data.europa.eu/949/permittedContactForce
          "1.1.1.2.5.3": null, // http://data.europa.eu/949/automaticDroppingDeviceRequired
          currentLimitationParam: {
            domain: "era:contactLineSystem", // Path for these params is: SOL -> Track -> ContactLineSystem
            "1.1.1.2.5.1": null, // http://data.europa.eu/949/currentLimitationRequired
          },
        },
      },
      controlCommandAndSignallingSubsystem: {
        declarationsOfVerificationForTrack: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.3.1.1": null, // http://data.europa.eu/949/verificationCSS
        },
        tsiCompliantTrainProtectionSystem: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.3.2.3": null, // http://data.europa.eu/949/etcsInfillLineAccess
          "1.1.1.3.2.4": null, // http://data.europa.eu/949/etcsInfill
          "1.1.1.3.2.5": null, // http://data.europa.eu/949/etcsNationalPacket44
          "1.1.1.3.2.6": null, // http://data.europa.eu/949/hasETCSRestrictionsConditions
          "1.1.1.3.2.7": null, // http://data.europa.eu/949/etcsOptionalFunctions
          "1.1.1.3.2.8": null, // http://data.europa.eu/949/trainIntegrityOnBoardRequired
          "1.1.1.3.2.9": null, // http://data.europa.eu/949/etcsSystemCompatibility
          "1.1.1.3.2.10": null, // http://data.europa.eu/949/etcsMVersion
          trainProtectionSystemParams: {
            domain: "era:etcsLevel", // Path for these params is: SOL -> Track -> ETCSLevel
            "1.1.1.3.2.1": null, // http://data.europa.eu/949/etcsLevelType
            "1.1.1.3.2.2": null, // http://data.europa.eu/949/etcsBaseline
          },
        },
        tsiCompliantRadio: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.3.3.1": null, // http://data.europa.eu/949/gsmRVersion
          "1.1.1.3.3.2": null, // http://data.europa.eu/949/gsmRActiveMobiles
          "1.1.1.3.3.3": null, // http://data.europa.eu/949/gsmROptionalFunctions
          "1.1.1.3.3.3.1": null, // http://data.europa.eu/949/gsmRAdditionalInfo
          "1.1.1.3.3.3.2": null, // http://data.europa.eu/949/gprsForETCS
          "1.1.1.3.3.3.3": null, // http://data.europa.eu/949/gprsImplementationArea
          "1.1.1.3.3.4": null, // http://data.europa.eu/949/usesGroup555
          "1.1.1.3.3.5": null, // http://data.europa.eu/949/gsmrNetworkCoverage
          "1.1.1.3.3.6": null, // http://data.europa.eu/949/publicNetworkRoaming
          "1.1.1.3.3.7": null, // http://data.europa.eu/949/publicNetworkRoamingDetails
          "1.1.1.3.3.8": null, // http://data.europa.eu/949/gsmRNoCoverage
          "1.1.1.3.3.9": null, // http://data.europa.eu/949/voiceRadioCompatible
          "1.1.1.3.3.10": null, // http://data.europa.eu/949/dataRadioCompatible
        },
        trainDetectionSystemsFullyCompliantWithTheTSI: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.3.4.1": null, // http://data.europa.eu/949/hasTSITrainDetection
        },
        trainProtectionLegacySystems: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.3.5.1": null, // http://data.europa.eu/949/hasOtherTrainProtection
          "1.1.1.3.5.2": null, // http://data.europa.eu/949/multipleTrainProtectionRequired
          "1.1.1.3.5.3": null, // http://data.europa.eu/949/protectionLegacySystem
        },
        otherRadioSystems: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.3.6.1": null, // http://data.europa.eu/949/legacyRadioSystem
        },
        trainDetectionSystemsNotFullyCompliantWithTheTSI: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.3.7.1.3": null, // http://data.europa.eu/949/trainDetectionSystemSpecificCheckDocument
          "1.1.1.3.7.1.4": null, // http://data.europa.eu/949/frenchTrainDetectionSystemLimitation
          trainDetectionSystemParams: {
            domain: "era:trainDetectionSystem", // Path for these params is: SOL -> Track -> TrainDetectionSystem
            "1.1.1.3.7.1.1": null, // http://data.europa.eu/949/trainDetectionSystemType
            "1.1.1.3.7.1.2": null, // http://data.europa.eu/949/trainDetectionSystemSpecificCheck
            "1.1.1.3.7.2.1": null, // http://data.europa.eu/949/tsiCompliantMaxDistConsecutiveAxles
            "1.1.1.3.7.2.2": null, // http://data.europa.eu/949/maxDistConsecutiveAxles
            "1.1.1.3.7.3": null, // http://data.europa.eu/949/minDistConsecutiveAxles
            "1.1.1.3.7.4": null, // http://data.europa.eu/949/minDistFirstLastAxle
            "1.1.1.3.7.5": null, // http://data.europa.eu/949/maxDistEndTrainFirstAxle
            "1.1.1.3.7.6": null, // http://data.europa.eu/949/minRimWidth
            "1.1.1.3.7.7": null, // http://data.europa.eu/949/minWheelDiameter
            "1.1.1.3.7.8": null, // http://data.europa.eu/949/minFlangeThickness
            "1.1.1.3.7.9": null, // http://data.europa.eu/949/minFlangeHeight
            "1.1.1.3.7.10": null, // http://data.europa.eu/949/maxFlangeHeight
            "1.1.1.3.7.11": null, // http://data.europa.eu/949/minAxleLoad
            "1.1.1.3.7.11.1": null, // http://data.europa.eu/949/minAxleLoadVehicleCategory
            "1.1.1.3.7.12": null, // http://data.europa.eu/949/tsiCompliantMetalFreeSpace
            "1.1.1.3.7.13": null, // http://data.europa.eu/949/tsiCompliantMetalConstruction
            "1.1.1.3.7.14": null, // http://data.europa.eu/949/tsiCompliantFerromagneticWheel
            "1.1.1.3.7.15.1": null, // http://data.europa.eu/949/tsiCompliantMaxImpedanceWheelset
            "1.1.1.3.7.15.2": null, // http://data.europa.eu/949/maxImpedanceWheelset
            "1.1.1.3.7.16": null, // http://data.europa.eu/949/tsiCompliantSanding
            "1.1.1.3.7.17": null, // http://data.europa.eu/949/maxSandingOutput
            "1.1.1.3.7.18": null, // http://data.europa.eu/949/requiredSandingOverride
            "1.1.1.3.7.19": null, // http://data.europa.eu/949/tsiCompliantSandCharacteristics
            "1.1.1.3.7.20": null, // http://data.europa.eu/949/flangeLubeRules
            "1.1.1.3.7.21": null, // http://data.europa.eu/949/tsiCompliantCompositeBrakeBlocks
            "1.1.1.3.7.22": null, // http://data.europa.eu/949/tsiCompliantShuntDevices
            "1.1.1.3.7.23": null, // http://data.europa.eu/949/tsiCompliantRSTShuntImpedance
          },
        },
        transitionsBetweenSystems: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.3.8.1": null, // http://data.europa.eu/949/switchProtectControlWarning
          "1.1.1.3.8.2": null, // http://data.europa.eu/949/switchRadioSystem
        },
        parametersRelatedToElectromagneticInterferences: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.3.9.1": null, // http://data.europa.eu/949/TSIMagneticFields
          "1.1.1.3.9.2": null, // http://data.europa.eu/949/TSITractionHarmonics
        },
        lineSideSystemForDegradedSituation: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.3.10.1": null, // http://data.europa.eu/949/etcsDegradedSituation
          "1.1.1.3.10.2": null, // http://data.europa.eu/949/otherTrainProtection
        },
        brakeRelatedParameters: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.3.11.1": null, // http://data.europa.eu/949/maximumBrakingDistance
          "1.1.1.3.11.2": null, // http://data.europa.eu/949/hasAdditionalBrakingInformation
          "1.1.1.3.11.3": null, // http://data.europa.eu/949/additionalBrakingInformationDocument
        },
        otherCCSRelatedParameters: {
          domain: "era:track", // Path for these params is: SOL -> Track
          "1.1.1.3.12.1": null, // http://data.europa.eu/949/tiltingSupported
        },
      },
      rulesAndRestriction: {
        domain: "era:track", // Path for these params is: SOL -> Track
        "1.1.1.4.1": null, // http://data.europa.eu/949/localRulesOrRestrictions
        "1.1.1.4.2": null, // http://data.europa.eu/949/localRulesOrRestrictionsDoc
      },
    },
  },
};

const TYPES = {
  "1.1.0.0.0.6": "concepts/sol-natures/SoLNatures",
  "1.1.1.0.0.2": "concepts/track-running-directions/TrackRunningDirections",
  "1.1.1.1.2.1": "concepts/ten-classifications/TENClassifications",
  "1.1.1.1.2.2": "concepts/line-category/LineCategories",
  "1.1.1.1.2.3": "concepts/freight-corridor/FreightCorridors",
  "1.1.1.1.2.4": "concepts/load-capabilities/LoadCapabilities",
  "1.1.1.1.3.1.1": "concepts/gaugings/GaugingProfiles",
  "1.1.1.1.3.4": "concepts/profile-num-swap-bodies/ProfileNumbersSwapBodies",
  "1.1.1.1.3.5":
    "concepts/profile-num-semi-trailers/ProfileNumbersSemiTrailers",
  "1.1.1.1.4.1": "concepts/nominal-track-gauges/NominalTrackGauges",
  "1.1.1.1.4.3": "concepts/rail-inclinations/RailInclinations",
  "1.1.1.1.6.2": "concepts/eddy-current-braking/EddyCurrentBraking",
  "1.1.1.1.6.3": "concepts/magnetic-braking/MagneticBraking",
  "1.1.1.1.8.10": "concepts/rolling-stock-fire/Categories",
  "1.1.1.2.2.1.1": "concepts/contact-line-systems/ContactLineSystems",
  "1.1.1.2.2.1.2": "concepts/energy-supply-systems/EnergySupplySystems",
  "1.1.1.2.3.1": "concepts/pantograph-heads/PantographHeads",
  "1.1.1.2.3.2": "concepts/pantograph-heads/PantographHeads",
  "1.1.1.2.3.4": "concepts/contact-strip-materials/ContactStripMaterials",
  "1.1.1.3.2.1": "concepts/etcs-levels/ETCSLevels",
  "1.1.1.3.2.2": "concepts/etcs-baselines/ETCSBaselines",
  "1.1.1.3.2.4": "concepts/etcs-infills/ETCSInfills",
  "1.1.1.3.2.9":
    "concepts/etcs-system-compatibilities/ETCSSystemCompatibilities",
  "1.1.1.3.2.10": "concepts/etcs-m-versions/ETCSMVersions",
  "1.1.1.3.3.1": "concepts/gsmr-versions/GSMRVersions",
  "1.1.1.3.3.2": "concepts/gsmr-number-active-mobiles/NumberActiveMobiles",
  "1.1.1.3.3.3": "concepts/gsmr-optional-functions/OptionalFunctions",
  "1.1.1.3.3.5": "concepts/gsmr-networks/GSMRNetworks",
  "1.1.1.3.3.9":
    "concepts/radio-system-compatibilities/RadioSystemCompatibilities",
  "1.1.1.3.3.10":
    "concepts/radio-system-compatibilities/RadioSystemCompatibilities",
  "1.1.1.3.5.3":
    "concepts/train-protection-legacy-systems/TrainProtectionLegacySystems",
  "1.1.1.3.6.1": "concepts/legacy-radio-systems/LegacyRadioSystems",
  "1.1.1.3.7.1.1": "concepts/train-detection/TrainDetectionSystems",
  "1.1.1.3.7.1.2":
    "concepts/train-detection-specific-checks/TrainDetectionSystemsSpecificChecks",
  "1.1.1.3.7.1.4":
    "concepts/train-detection/FrenchTrainDetectionSystemLimitations",
  "1.1.1.3.7.2.1": "concepts/tsi-compliances/TSICompliances",
  "1.1.1.3.7.11.1":
    "concepts/min-axle-loads-per-vehicle-category/MinAxleLoadsPerVehicleCategory",
  "1.1.1.3.7.12": "concepts/tsi-compliances/TSICompliances",
  "1.1.1.3.7.13": "concepts/tsi-compliances/TSICompliances",
  "1.1.1.3.7.14": "concepts/tsi-compliances/TSICompliances",
  "1.1.1.3.7.15.1": "concepts/tsi-compliances/TSICompliances",
  "1.1.1.3.7.16": "concepts/tsi-compliances/TSICompliances",
  "1.1.1.3.7.17": "concepts/max-amount-sandings/MaxAmountSandings",
  "1.1.1.3.7.19": "concepts/tsi-compliances/TSICompliances",
  "1.1.1.3.7.21": "concepts/tsi-compliances/TSICompliances",
  "1.1.1.3.7.22": "concepts/tsi-compliances/TSICompliances",
  "1.1.1.3.7.23": "concepts/tsi-compliances/TSICompliances",
  "1.1.1.3.9.1": "concepts/tsi-compliances/TSICompliances",
  "1.1.1.3.9.2": "concepts/tsi-compliances/TSICompliances",
  "1.1.1.3.10.1": "concepts/etcs-situation/ETCSSituations",
  "1.1.1.3.10.2":
    "concepts/other-protection-control-warning/OtherProtectionControlWarnings",
  "1.2.0.0.0.4": "concepts/op-types/OperationalPointTypes",
  "1.2.1.0.2.1": "concepts/ten-classifications/TENClassifications",
  "1.2.1.0.2.2": "concepts/line-category/LineCategories",
  "1.2.1.0.2.3": "concepts/freight-corridor/FreightCorridors",
  "1.2.1.0.3.4": "concepts/gaugings/GaugingProfiles",
  "1.2.1.0.4.1": "concepts/nominal-track-gauges/NominalTrackGauges",
  "1.2.1.0.5.7": "concepts/rolling-stock-fire/Categories",
  "1.2.1.0.6.3": "concepts/ten-classifications/TENClassifications",
  "1.2.1.0.6.5": "concepts/platform-heights/PlatformHeights",
  "1.2.2.0.0.3": "concepts/ten-classifications/TENClassifications",
  "1.2.2.0.5.7": "concepts/rolling-stock-fire/Categories",
};

const BASE_EUROPA_COUNTRY_URL =
  "http://publications.europa.eu/resource/authority/country/";
const countries = [
  "ITA",
  "CZE",
  "FIN",
  "BEL",
  "FRA",
  "GBR",
  "SWE",
  "GRC",
  "PRT",
  "DNK",
  "BGR",
  "HUN",
  "CHE",
  "ROU",
  "DEU",
  "AUT",
  "NOR",
  "NLD",
  "EST",
  "LTU",
  "LUX",
  "ESP",
  "LVA",
  "HRV",
  "POL",
  "SVN",
  "SVK",
];

function withInCountry(params) {
  const language = getCurrentLanguage();
  const data = countries.map((c) => {
    return {
      value: `${BASE_EUROPA_COUNTRY_URL}${c}`,
      label: getPhrase(`${BASE_EUROPA_COUNTRY_URL}${c}`, language),
    };
  });

  const inCountry = {
    domain: [],
    type: "multiple-select",
    label: "Member State",
    index: `${BASE_URI}inCountry`,
    data: data.sort((a, b) => a.label.localeCompare(b.label)),
  };

  return { OP: { inCountry, ...params.OP }, SOL: { inCountry, ...params.SOL } };
}

function getMultipleSelectOptions(graphStore, rinf) {
  if (!TYPES[rinf]) {
    console.log("no type range found for rinf index:", rinf);
    return [];
  }

  const types = Utils.queryGraphStore({
    store: graphStore,
    o: BASE_URI + TYPES[rinf],
  });

  if (!types) {
    console.log("no types found for rinf index:", rinf, "type:", TYPES[rinf]);
    return [];
  }

  const data = Object.keys(types || {}).map((type) => {
    const typeInfo = Utils.queryGraphStore({ store: graphStore, s: type });

    return (
      typeInfo &&
      typeInfo[type] && {
        value: type,
        label: Utils.getLiteralInLanguage(
          typeInfo[type][SKOS.prefLabel],
          getCurrentLanguage()
        ),
      }
    );
  });
  return data.filter((d) => {
    return d && d.value && d.label;
  });
}

function getIdByRinf(indexes, rinf) {
  for (const index of Object.keys(indexes || {})) {
    const indexRinf = indexes[index][ERA.rinfIndex];
    if (Array.isArray(indexRinf)) {
      if (indexRinf.findIndex((i) => i.value === rinf) >= 0) {
        return index;
      }
    } else {
      if (indexRinf.value === rinf) {
        return index;
      }
    }
  }
  return null;
}

function getParams(params, graphStore, allRinfIndexes, currentDomains) {
  if (!allRinfIndexes) {
    allRinfIndexes = Utils.queryGraphStore({
      store: graphStore,
      p: ERA.rinfIndex,
    });
  }
  if (!Array.isArray(currentDomains)) {
    currentDomains = [];
  }

  if (typeof params === "string") return null;

  const ret = {};
  for (const param of Object.keys(params || {})) {
    if (param === "domain") {
      currentDomains = [...currentDomains, params[param]];
    } else if (params[param] === null) {
      const index = getIdByRinf(allRinfIndexes, param);
      if (index) {
        const w = Utils.queryGraphStore({ store: graphStore, s: index });
        const word = w[index];
        const label = Utils.getLiteralInLanguage(
          word[RDFS.label],
          getCurrentLanguage()
        );
        const comment = Utils.getLiteralInLanguage(
          word[RDFS.comment],
          getCurrentLanguage()
        );

        let type, data;
        switch (word[a].value) {
          case OWL.owlObjectProperty:
            data = getMultipleSelectOptions(graphStore, param);
            if (!Array.isArray(data) || data.length === 0) {
              type = "text";
            } else {
              type = "multiple-select";
            }
            break;
          case OWL.owlDataTypeProperty:
            switch (word[RDFS.range].value) {
              case XSD.double:
                type = "number";
                break;
              case XSD.integer:
                type = "number";
                break;
              case XSD.string:
                type = "text";
                break;
              case XSD.boolean:
                type = "select";
                data = [
                  { label: "Y", value: "true" },
                  { label: "N", value: "false" },
                ];
                break;
              default:
                console.log("missing range:", word[RDFS.range]);
                type = "text";
                break;
            }
            break;
          default:
            console.log("missing type:", word[a]);
        }

        ret[param] = {
          type,
          label,
          comment,
          data,
          index,
          domain: currentDomains,
        };
      } else {
        console.log("missing rinf index:", param);
        ret[param] = {
          type: "text",
          label: param,
        };
      }
    } else if (!params[param].type) {
      ret[param] = {
        type: "sub",
        ...getParams(params[param], graphStore, allRinfIndexes, currentDomains),
      };
    } else {
      ret[param] = params[param];
    }
  }

  return ret;
}

export function getParamByRinf(params, rinf) {
  let result = null;
  for (const param of Object.keys(params || {})) {
    if (param === rinf) {
      return params[param];
    }
    if (params[param].type === "sub") {
      result = getParamByRinf(params[param], rinf);
    }
    if (result !== null) {
      return result;
    }
  }
  return result;
}

export function mountParamsFromVocabulary(graphStore) {
  const paramList = getParams(withInCountry(params), graphStore);
  console.log(paramList);
  return paramList;
}

export function getNameFromIndex(index) {
  if (typeof index !== "string") {
    return index;
  }
  const lastIndexOf = index.lastIndexOf("/");

  if (lastIndexOf < 0) {
    return index;
  }

  return index.slice(lastIndexOf + 1);
}
