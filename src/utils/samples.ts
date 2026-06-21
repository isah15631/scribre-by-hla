import { TranscriptionResult } from "../types";

export interface AudioSample {
  id: string;
  title: string;
  description: string;
  duration: string;
  dominantLanguage: string;
  mixRatio: string;
  result: TranscriptionResult;
}

export const AUDIO_SAMPLES: AudioSample[] = [
  {
    id: "kurmi-market",
    title: "Fabric Bargaining at Kurmi Market, Kano",
    description: "A fast-paced negotiations call between an Abuja retail customer and a traditional Kano textile merchant bargaining over premium Kaftan fabrics.",
    duration: "1m 15s",
    dominantLanguage: "Hausa (75% Hausa, 25% English)",
    mixRatio: "75% Hausa, 25% English",
    result: {
      title: "Cinikin Yadiddiga a Kasuwar Kurmi (Fabric Haggling)",
      summary: "An Abuja retailer negotiates prices for premium 'Shadda' (African brocade) and 'Atampa' fabrics with a veteran wholesaler at Kurmi Market, Kano. They agree on a bundle price for bulk order delivery.",
      dominantLanguage: "Mixed (Bilingual Hausa/English)",
      confidenceScore: "High",
      languageMixPercentage: "72% Hausa, 28% English",
      segments: [
        {
          timestamp: "00:00 - 00:09",
          speaker: "Alhaji Audu (Merchant)",
          originalText: "Assalamu alaikum baraka da yamma, shago na yana maraba da ku. Sannunku da zuwa!",
          translationText: "Peace be upon you, good afternoon, my shop welcomes you. You are all welcome!",
          spokenLanguage: "Hausa"
        },
        {
          timestamp: "00:09 - 00:21",
          speaker: "Halima (Retailer)",
          originalText: "Yauwa, Alhaji barka dai. I am looking for some high-quality Atampa fabrics. Na zo in bincika na yanke wholesale patterns na sabon shago na.",
          translationText: "Great, hello Alhaji. I am looking for some high-quality Atampa fabrics. I came to browse and pick wholesale patterns for my new store.",
          spokenLanguage: "Bilingual Code-Mixed"
        },
        {
          timestamp: "00:21 - 00:34",
          speaker: "Alhaji Audu (Merchant)",
          originalText: "Masha Allah! Muna da designs da yawa masu kyau. Look at this one, pure cotton ne, daga Holland aka kawo shi, sosai quality dinsa yana da mutunci.",
          translationText: "Praise be to God! We have so many beautiful designs. Look at this one, it is pure cotton, imported from Holland, its quality is highly respectable.",
          spokenLanguage: "Bilingual Code-Mixed"
        },
        {
          timestamp: "00:34 - 00:46",
          speaker: "Halima (Retailer)",
          originalText: "Wow, color din nan ya yi kyau sosai. Amma what is the wholesale unit price for this particular block of six yards? Ina fatan akwai discount.",
          translationText: "Wow, this color is very beautiful. But what is the wholesale unit price for this particular block of six yards? I hope there is a discount.",
          spokenLanguage: "Bilingual Code-Mixed"
        },
        {
          timestamp: "00:46 - 00:58",
          speaker: "Alhaji Audu (Merchant)",
          originalText: "Gaskiya wholesale rate dinmu na asali shi ne dubu sha biyar ne. Amma because you are buying in bulk, zan rage miki. Zan baki shi akan dubu sha uku kacal.",
          translationText: "Honestly, our original wholesale rate is 15,000 Naira. But because you are buying in bulk, I will reduce it for you. I will give it to you for just 13,000 Naira.",
          spokenLanguage: "Bilingual Code-Mixed"
        },
        {
          timestamp: "00:58 - 01:10",
          speaker: "Halima (Retailer)",
          originalText: "To Alhaji, dubu sha biyu fa? Saboda custom orders din da nake yi, fast delivery dinnan will take money. Let's agree on twelve thousand please.",
          translationText: "Okay Alhaji, how about twelve thousand Naira? Because of the custom orders I'm doing, that fast delivery will cost money. Let's agree on twelve thousand please.",
          spokenLanguage: "Bilingual Code-Mixed"
        },
        {
          timestamp: "01:10 - 01:15",
          speaker: "Alhaji Audu (Merchant)",
          originalText: "To madalla, ba damuwa! Saboda bakuwa ce ke, Allah ya sanya albarka cikin kasuwancinmu.",
          translationText: "Alright, excellent, no problem! Since you are a new customer, may God bless our trade.",
          spokenLanguage: "Hausa"
        }
      ],
      vocabulary: [
        {
          phrase: "Sannunku da zuwa",
          originalLanguage: "Hausa",
          literalMeaning: "Welcome to all of you / Hello upon your arrival",
          culturalContext: "Standard polite term used to warmly welcome a group of people or an individual customer entering a place of business."
        },
        {
          phrase: "To madalla",
          originalLanguage: "Hausa",
          literalMeaning: "Okay, praise be to God / Excellent",
          culturalContext: "An exclamation indicating satisfactory agreement, relief, or wrapping up a mutual transaction or conversation on a pleasant note."
        },
        {
          phrase: "Ba damuwa",
          originalLanguage: "Hausa",
          literalMeaning: "No worries / No problem",
          culturalContext: "Exceedingly common everyday phrase used interchangeably with English 'no problem' to signify accommodation, peace, or concession."
        },
        {
          phrase: "Allah ya sanya albarka",
          originalLanguage: "Hausa",
          literalMeaning: "May God put blessing in it",
          culturalContext: "Standard Islamic-influenced blessing said by Hausa merchants upon concluding a sale or business agreement. It cements goodwill and ensures clean commercial relations."
        }
      ]
    }
  },
  {
    id: "kaduna-tech-hub",
    title: "Kaduna Software Standup Meeting",
    description: "An authentic engineering standup in a Kaduna incubation incubator, where tech developers mix Hausa syntax with English programming terminology.",
    duration: "1m 30s",
    dominantLanguage: "English (60% English, 40% Hausa)",
    mixRatio: "60% English, 40% Hausa",
    result: {
      title: "Hadakar Shirye-Shiryen Kaduna Tech Standup",
      summary: "A software engineering team in Kaduna reviews their product sprints. They discuss completing code-mixing APIs and resolving local database container failures using Docker commands.",
      dominantLanguage: "Mixed (Bilingual Hausa/English)",
      confidenceScore: "High",
      languageMixPercentage: "58% English, 42% Hausa",
      segments: [
        {
          timestamp: "00:00 - 00:15",
          speaker: "Farooq (Lead Dev)",
          originalText: "Good morning team, let's start the standup. Mu duba tickets dinnan na Jira mu gani. Fati, can you please update us on the frontend UI status?",
          translationText: "Good morning team, let's start the standup. Let's look at those Jira tickets and see. Fati, can you please update us on the frontend UI status?",
          spokenLanguage: "Bilingual Code-Mixed"
        },
        {
          timestamp: "00:15 - 00:30",
          speaker: "Fati (Frontend)",
          originalText: "Mun kammala UI screens duka jiya, but general responsiveness remains buggy on Safari. Haka kuma, standard audio recorder component din yana da issues.",
          translationText: "We completed all the UI screens yesterday, but general responsiveness remains buggy on Safari. Also, the standard audio recorder component is having issues.",
          spokenLanguage: "Bilingual Code-Mixed"
        },
        {
          timestamp: "00:30 - 00:46",
          speaker: "Shehu (Backend)",
          originalText: "Don't worry about the audio component, I can check that. Idan na hada endpoint din yau, za mu yi deployment direct to Cloud Run. Jira na me yake cewa kuma?",
          translationText: "Don't worry about the audio component, I can check that. If I finish connecting the endpoint today, we will deploy directly to Cloud Run. What is my Jira ticket saying as well?",
          spokenLanguage: "Bilingual Code-Mixed"
        },
        {
          timestamp: "00:46 - 01:05",
          speaker: "Farooq (Lead Dev)",
          originalText: "Shehu, ticket dinka yana bukatar API speed optimization. Backend din yana da slow latency a lokacin da muke upload na heavy voice inputs. We need caching.",
          translationText: "Shehu, your ticket requires API speed optimization. The backend has slow latency when uploading heavy voice inputs. We need caching.",
          spokenLanguage: "Bilingual Code-Mixed"
        },
        {
          timestamp: "01:05 - 01:21",
          speaker: "Shehu (Backend)",
          originalText: "Haka ne gaskiya, na yarda. Za mu yi caching na metadata. Amma don Allah, look at the database configuration, na kiyaye wani error da safe nan.",
          translationText: "That is true indeed, I agree. We will cache the metadata. But please, look at the database configuration, I noticed an error this morning.",
          spokenLanguage: "Bilingual Code-Mixed"
        },
        {
          timestamp: "01:21 - 01:30",
          speaker: "Farooq (Lead Dev)",
          originalText: "To madalla. Let's fix that blocking error first da safe nan so we can initiate testing. Na gode abokan aiki!",
          translationText: "Okay, perfect. Let's fix that blocking error first this morning so we can initiate testing. Thank you, colleagues!",
          spokenLanguage: "Bilingual Code-Mixed"
        }
      ],
      vocabulary: [
        {
          phrase: "Don Allah",
          originalLanguage: "Hausa",
          literalMeaning: "For God's sake / Please",
          culturalContext: "Extremely common idiom used for politeness, begging, emphasizing requests, or expressing earnest appeal in West African business and daily exchanges."
        },
        {
          phrase: "Haka ne gaskiya",
          originalLanguage: "Hausa",
          literalMeaning: "That is indeed true / Indeed",
          culturalContext: "Used to agree fully with another speaker's technical claim or observation. Asserts truth and mutual understanding in conversation."
        },
        {
          phrase: "Na gode",
          originalLanguage: "Hausa",
          literalMeaning: "Thank you",
          culturalContext: "Universal expression of gratitude across all classes, contexts, and ages in northern Nigeria."
        },
        {
          phrase: "Abokan aiki",
          originalLanguage: "Hausa",
          literalMeaning: "Coworkers / Colleagues",
          culturalContext: "Warm and cooperative workplace greeting used to address team members with collaborative collegiality."
        }
      ]
    }
  },
  {
    id: "eid-greeting",
    title: "Family Eid Greeting Call (In-Transit)",
    description: "An affectionate, warm family phone call made on Eid-el-Kabir (Babbar Sallah), blending English conversation with heartfelt traditional Hausa blessings.",
    duration: "1m 05s",
    dominantLanguage: "Hausa (80% Hausa, 20% English)",
    mixRatio: "80% Hausa, 20% English",
    result: {
      title: "Gaisuwar Babbar Sallah Daga Amurka (Holiday Call)",
      summary: "A younger relative calling from abroad connects with family members in Abuja to offer Eid-el-Kabir celebrations, exchanging mutual wishes, expressions of health, and prayers for travel safety.",
      dominantLanguage: "Hausa (80% Hausa, 20% English)",
      confidenceScore: "High",
      languageMixPercentage: "80% Hausa, 20% English",
      segments: [
        {
          timestamp: "00:00 - 00:12",
          speaker: "Musa (In Abroad)",
          originalText: "Hello Mama, can you hear me? Barka da Sallah! Fatan kun tashi lafiya, are everyone gathered at home today?",
          translationText: "Hello Mom, can you hear me? Happy Eid! Hope you woke up in good health, is everyone gathered at home today?",
          spokenLanguage: "Bilingual Code-Mixed"
        },
        {
          timestamp: "00:12 - 00:26",
          speaker: "Mama (Abuja)",
          originalText: "Musa! Barka da Sallah jaririna. Alhamdulillah, muna jinka sosai. Kowa yana nan kusa da ni, fatan kana lafiya a can kuma?",
          translationText: "Musa! Happy Eid, my child. Praise be to God, we hear you very clearly. Everyone is here next to me, hoping you are in good health over there too?",
          spokenLanguage: "Hausa"
        },
        {
          timestamp: "00:26 - 00:38",
          speaker: "Musa (In Abroad)",
          originalText: "Lafiya kalau, Mama. We miss the mutton feast so much! Amma Allah ya bamu rai da lafiya, next year we will celebrate together in Abuja.",
          translationText: "Very healthy, Mom. We miss the mutton feast so much! But as God grants us life and health, next year we will celebrate together in Abuja.",
          spokenLanguage: "Bilingual Code-Mixed"
        },
        {
          timestamp: "00:38 - 00:52",
          speaker: "Mama (Abuja)",
          originalText: "Amin summa amin! Allah ya albarkaci karatunka, ya kare ka daga dukkan sharri. Take care of yourself in that cold weather, please.",
          translationText: "Amen, amen indeed! May God bless your studies and protect you from all harm. Take care of yourself in that cold weather, please.",
          spokenLanguage: "Bilingual Code-Mixed"
        },
        {
          timestamp: "00:52 - 01:05",
          speaker: "Musa (In Abroad)",
          originalText: "Amin, naga gaisuwar Uncle Aminu ma. Bye mama, tell them I said Happy Holiday, gaishe su duka!",
          translationText: "Amen, I see Uncle Aminu's greetings too. Bye Mom, tell them I said Happy Holiday, greet them all!",
          spokenLanguage: "Bilingual Code-Mixed"
        }
      ],
      vocabulary: [
        {
          phrase: "Barka da Sallah",
          originalLanguage: "Hausa",
          literalMeaning: "Blessings of Eid / Happy Sallah holiday",
          culturalContext: "The absolute standard, highly affectionate greeting traded by all during Eid holiday celebrations, embodying blessings, togetherness, and cultural pride."
        },
        {
          phrase: "Fatan lafiya / Tashi lafiya",
          originalLanguage: "Hausa",
          literalMeaning: "Wishing you good health / Hope you woke up well",
          culturalContext: "The essential respectful Hausa inquiry concerning an individual's welfare, fundamental to social warmth and greeting protocols."
        },
        {
          phrase: "Amin summa amin",
          originalLanguage: "Hausa",
          literalMeaning: "Amen and Amen / May it be so redoubled",
          culturalContext: "An emphasized spiritual agreement, heavily traded when parent figures or elders articulate protective or prosperous prayers for younger relatives."
        },
        {
          phrase: "Alhamdulillah",
          originalLanguage: "Hausa",
          literalMeaning: "Praise be to Allah / Thank God",
          culturalContext: "Widely woven religious expression common in regular conversational Hausa to express contentment, relief, or overall wellness."
        }
      ]
    }
  }
];
