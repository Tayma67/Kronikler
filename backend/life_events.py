"""
Life Event Popup Sistemi — Kronikler: Küllerin Mirası
Adım 5 — 40 event (16 çocukluk + 18 gençlik + 6 yetişkinlik)
"""
import random

LIFE_EVENTS = [

    # ─────────────────────────────────────────
    # 🧒 ÇOCUKLUK  (7–12)  — 16 event
    # ─────────────────────────────────────────
    {
        "id": "event_bully",
        "title": "Zorba Çocuk",
        "description": "Okul bahçesinde büyük bir çocuk seni köşeye sıkıştırdı. Ne yapacaksın?",
        "icon": "👊",
        "conditions": {"age_min": 7, "age_max": 12},
        "choices": [
            {"text": "Karşı koy ve dövüş", "effects": {"stamina": 1, "health": -10, "fear": 5}, "result": "Burnun kanadı ama ayakta kaldın. Artık sana saygı duyuyorlar."},
            {"text": "Kaç ve öğretmene söyle", "effects": {"charisma": -1, "reputation": -2}, "result": "Güvende kaldın ama arkandan 'muhbir' dediler."},
            {"text": "Arkadaşlarını çağır", "effects": {"social": 2, "charisma": 1}, "result": "Birlikte güçlüsünüz — zorba çekildi. Dostluğunuz güçlendi."}
        ]
    },
    {
        "id": "event_sick_parent",
        "title": "Hasta Ebeveyn",
        "description": "Annen yatağa düştü, ateşi çok yüksek. Aile paraya ihtiyaç duyuyor.",
        "icon": "🤒",
        "conditions": {"age_min": 7, "age_max": 12},
        "choices": [
            {"text": "Komşulardan yardım iste", "effects": {"charisma": 1, "money": 20, "reputation": 3}, "result": "Komşular el uzattı. Annen iyileşti, köyde iyi bir isim kazandın."},
            {"text": "Köydeki şifacıya git", "effects": {"money": -30, "honor": 3}, "result": "Para gitti ama annen birkaç gün içinde ayağa kalktı."},
            {"text": "Ağlayarak bekle", "effects": {"intelligence": -1, "health": -5}, "result": "Gecikmek işleri daha da kötüleştirdi."}
        ]
    },
    {
        "id": "event_found_money",
        "title": "Yerde Para Bulmak",
        "description": "Çarşıda yere eğilirken çamura batmış 15 altın gördün. Kimse bakmıyor.",
        "icon": "💰",
        "conditions": {"age_min": 7, "age_max": 12},
        "choices": [
            {"text": "Sessizce cebe at", "effects": {"money": 15, "honor": -3}, "result": "Para senin oldu. Ama için rahat değil."},
            {"text": "Köy muhtarına teslim et", "effects": {"honor": 5, "reputation": 5}, "result": "Muhtar seni halka örnek gösterdi. Adın çıktı."},
            {"text": "Arkadaşlarla paylaş", "effects": {"money": 5, "social": 2, "charisma": 1}, "result": "Herkes mutlu oldu. Sen de 5 altın kazandın ve dostlarını kazandın."}
        ]
    },
    {
        "id": "event_stray_animal",
        "title": "Yaralı Hayvan",
        "description": "Yolda bacağı kırık bir köpek yavrusu yatıyor. Sana bakıyor.",
        "icon": "🐕",
        "conditions": {"age_min": 7, "age_max": 12},
        "choices": [
            {"text": "Eve götür ve bak", "effects": {"intelligence": 1, "honor": 3}, "result": "Yavru iyileşti ve en sadık dostun oldu."},
            {"text": "Şifacıya götür", "effects": {"money": -10, "honor": 5}, "result": "Para verdiler ama yavruyu kurtardın."},
            {"text": "Geç git, ilgilenemezsin", "effects": {"honor": -2}, "result": "Geride bıraktın. O bakışlar aklına takıldı."}
        ]
    },
    {
        "id": "event_schoolfight",
        "title": "Okul Kavgası",
        "description": "Sınıfta büyük kavga çıktı. Herkes taraf seçiyor. Sen ne yapacaksın?",
        "icon": "🔥",
        "conditions": {"age_min": 7, "age_max": 12},
        "choices": [
            {"text": "Güçlünün yanını tut", "effects": {"crime": 2, "reputation": -2, "fear": 3}, "result": "Kazandın ama haksız taraftaydın."},
            {"text": "Zayıfı savun", "effects": {"stamina": 1, "honor": 5, "health": -5}, "result": "Darbe yesen de doğruyu yaptın."},
            {"text": "Öğretmeni çağır", "effects": {"reputation": 3, "charisma": 1}, "result": "Kavga bitti. Öğretmen seni övdü."}
        ]
    },
    {
        "id": "event_lost",
        "title": "Ormanda Kaybolmak",
        "description": "Ailenden uzaklaştın, orman sık ve gün batıyor. Hiçbir şey tanıdık gelmiyor.",
        "icon": "🌲",
        "conditions": {"age_min": 7, "age_max": 12},
        "choices": [
            {"text": "Sakin kal, bir yere otur ve bekle", "effects": {"intelligence": 1}, "result": "Ailenin seni bulması birkaç saat sürdü. Sabırlıydın."},
            {"text": "Yüksek sesle bağır", "effects": {"health": -5}, "result": "Saatler bağırdın, sesin kısıldı ama bulundun."},
            {"text": "Kendi yolunu bul", "effects": {"intelligence": 2, "stamina": 1, "health": -10}, "result": "Yıldızlara bakarak yönünü buldun. Hem yoruldun hem gurur duydun."}
        ]
    },
    {
        "id": "event_village_fire",
        "title": "Köy Yangını",
        "description": "Gece ortasında çığlıklar seni uyandırdı. Komşunun ahırı alevler içinde!",
        "icon": "🔥",
        "conditions": {"age_min": 7, "age_max": 12},
        "choices": [
            {"text": "Kova kova su taşı", "effects": {"stamina": 2, "honor": 5, "health": -5}, "result": "Gece boyunca koşurdun. Hayvanlar kurtarıldı. Köy seni övdü."},
            {"text": "Komşuları uyandır, yardım getir", "effects": {"charisma": 2, "reputation": 4}, "result": "Haykırışların köyü ayağa kaldırdı. Ekip çalışması yangını söndürdü."},
            {"text": "Uzaktan izle, korkudan donakaldın", "effects": {"fear": 5, "honor": -3}, "result": "Ellerin titremişti. Komşular yardıma koşarken sen izledin."}
        ]
    },
    {
        "id": "event_harvest_help",
        "title": "Hasat Yardımı",
        "description": "Yaşlı çiftçi amca bu yıl hasat edemeyecek kadar hasta. Herkes geçip gidiyor.",
        "icon": "🌾",
        "conditions": {"age_min": 7, "age_max": 12},
        "choices": [
            {"text": "Tek başına yardım et, tüm gün çalış", "effects": {"stamina": 2, "honor": 6, "health": -5}, "result": "Ellerin kabardı ama amcanın gözleri doldu."},
            {"text": "Arkadaşları organize et", "effects": {"charisma": 2, "social": 2, "reputation": 5}, "result": "Beş çocuk birlikte çalıştı. Hasat bitmeden güneş batmadı."},
            {"text": "Geç, senin işin değil", "effects": {"honor": -4}, "result": "Amca o kış çok zorlandı. Kasabada bunu öğrenenler senden soğudu."}
        ]
    },
    {
        "id": "event_lost_child",
        "title": "Kayıp Çocuk",
        "description": "Çarşıda ağlayan küçük bir çocuk var. Annesini arıyor, çok korkmuş.",
        "icon": "👶",
        "conditions": {"age_min": 7, "age_max": 12},
        "choices": [
            {"text": "Annesiyle bulana kadar yanında kal", "effects": {"honor": 5, "charisma": 1}, "result": "Yarım saat uğraştın. Annesi seni görünce sarıldı."},
            {"text": "Gardiyana götür", "effects": {"reputation": 3, "honor": 3}, "result": "Gardiyan anne-çocuğu buluşturdu. Herkes seni gördü."},
            {"text": "Yanından geç", "effects": {"honor": -3}, "result": "Vicdan azabı seni uzun süre rahatsız etti."}
        ]
    },
    {
        "id": "event_parents_fight",
        "title": "Aile Kavgası",
        "description": "Gece anne babanın sesini duydun. Çok şiddetli tartışıyorlar.",
        "icon": "😰",
        "conditions": {"age_min": 7, "age_max": 12},
        "choices": [
            {"text": "Araya gir ve sakinleştirmeye çalış", "effects": {"charisma": 1, "intelligence": 1, "health": -5}, "result": "Sesi duyunca sustular. Ağırlık omuzlarında kaldı."},
            {"text": "Yastığın altına koy başını", "effects": {"fear": 5, "intelligence": -1}, "result": "Gece boyu uyuyamadın. Sabah gözlerin şişmişti."},
            {"text": "Dışarı çık, yürüyüşe git", "effects": {"intelligence": 1, "stamina": 1}, "result": "Yıldızlara baktın ve düşündün. İçin karışık ama kafan biraz açıldı."}
        ]
    },
    {
        "id": "event_secret_hideout",
        "title": "Gizli Sığınak",
        "description": "Ormanda kimsenin bilmediği bir mağara buldun. İçinde eski eşyalar var.",
        "icon": "🗺️",
        "conditions": {"age_min": 7, "age_max": 12},
        "choices": [
            {"text": "Eşyaları al ve sat", "effects": {"money": 25, "honor": -3, "trade": 1}, "result": "Birkaç eski sikke ve tunç kap getirdin. Para iyi geldi."},
            {"text": "Muhtara haber ver", "effects": {"honor": 5, "reputation": 4}, "result": "Muhtar 'çok önemli bir keşif' dedi ve seni herkese anlattı."},
            {"text": "Gizli tut, kendi oyun alanın yap", "effects": {"intelligence": 2, "social": 1}, "result": "En yakın arkadaşlarını getirdin. Yıllar boyunca en iyi sığınağınız oldu."}
        ]
    },
    {
        "id": "event_fishing_accident",
        "title": "Balık Tutarken Kaza",
        "description": "Nehirde balık tutarken ayağın kaydı. Akıntı seni sürüklüyor!",
        "icon": "🌊",
        "conditions": {"age_min": 7, "age_max": 12},
        "choices": [
            {"text": "Paniklemeden yüzmeye çalış", "effects": {"stamina": 2, "intelligence": 1, "health": -10}, "result": "Güçlükle kıyıya ulaştın. Yoruldun ama kurtuldun."},
            {"text": "Bağır, yardım iste", "effects": {"health": -5, "charisma": 1}, "result": "Bir çiftçi seni duydu ve kurtardı. Ona minnettar kaldın."},
            {"text": "Dal tut, bekle", "effects": {"intelligence": 2, "health": -5}, "result": "Doğru karar — akıntı azalınca kıyıya çıkabildin."}
        ]
    },
    {
        "id": "event_stranger_gift",
        "title": "Yabancının Hediyesi",
        "description": "Kasabaya yabancı bir gezgin geldi. Sana küçük bir madalyon uzattı. 'Şans getirir' dedi.",
        "icon": "🏅",
        "conditions": {"age_min": 7, "age_max": 12},
        "choices": [
            {"text": "Teşekkürle al", "effects": {"honor": 2, "fame": 2}, "result": "Madalyonu taktın. Köyde herkes merak etti. Yabancı ertesi gün kaybolmuştu."},
            {"text": "Reddet, güvenmiyorum", "effects": {"intelligence": 1}, "result": "Yabancı anladı ve güldü. 'Akıllı çocuk' diyerek döndü."},
            {"text": "Al ama babana göster", "effects": {"honor": 3, "intelligence": 1}, "result": "Baban madalyonun eski ve değerli olduğunu söyledi. Sakladın."}
        ]
    },
    {
        "id": "event_first_theft_tempt",
        "title": "Tezgahtaki Elma",
        "description": "Açsın, parası yok. Tüccardın arkası dönük. Tezgahta kıpkırmızı bir elma var.",
        "icon": "🍎",
        "conditions": {"age_min": 7, "age_max": 12},
        "choices": [
            {"text": "Hızla kap ve kaç", "effects": {"crime": 3, "honor": -4, "hunger": -10}, "result": "Elmayı yedin. Ama o gün boyunca tüccarın yüzü belirdi."},
            {"text": "Çalışmayı teklif et, karşılığında iste", "effects": {"trade": 1, "honor": 3, "money": 5}, "result": "Tüccar güldü ve seni bir günlüğüne çalıştırdı. Karnın toktu."},
            {"text": "Açlığa katlan", "effects": {"stamina": 1, "honor": 2}, "result": "Zor geçti ama dürüst kaldın. Gece annen sana daha fazla ekmek kesti."}
        ]
    },
    {
        "id": "event_ghost_story",
        "title": "Hayalet Hikayesi",
        "description": "Büyükler eski han sahibinin ruhunun gece dolaştığını anlattı. Arkadaşların 'Git bak' diyor.",
        "icon": "👻",
        "conditions": {"age_min": 7, "age_max": 12},
        "choices": [
            {"text": "Git ve araştır", "effects": {"intelligence": 2, "fear": 5, "fame": 3}, "result": "Han ıssız ve karanlıktı. Bir fare sesi kalbini durdurdu. Ama geriye döndüğünde kahraman olmuştun."},
            {"text": "Reddet, aptalca", "effects": {"honor": -1, "intelligence": 1}, "result": "Arkadaşların seni biraz alaya aldı ama sen doğru yaptın."},
            {"text": "Hepsini götür, birlikte gidin", "effects": {"charisma": 2, "social": 2, "fear": 3}, "result": "Birlikte gittiniz. Korktunuz ama güldünüz. Haftalarca anlattınız."}
        ]
    },
    {
        "id": "event_mentor_blacksmith",
        "title": "Demircinin Teklifi",
        "description": "Köyün demircisi seni izledi. 'Körüğü üfler misin?' dedi.",
        "icon": "⚒️",
        "conditions": {"age_min": 7, "age_max": 12},
        "choices": [
            {"text": "Hevesle kabul et", "effects": {"stamina": 2, "crafting": 1, "money": 10}, "result": "Bir hafta boyunca her gün gidip çalıştın. Demir işlemeyi öğrenmeye başladın."},
            {"text": "Dene, beğenmezsen bırak", "effects": {"stamina": 1, "intelligence": 1}, "result": "İki gün çalıştın. Çok yorucuydu ama demirci gülerek anladı."},
            {"text": "Hayır, zamanım yok", "effects": {}, "result": "Demirci başını sallayıp döndü. Bir kapı kapandı."}
        ]
    },

    # ─────────────────────────────────────────
    # 🧑 GENÇLİK  (13–19)  — 18 event
    # ─────────────────────────────────────────
    {
        "id": "event_first_love",
        "title": "İlk Aşk İtirafı",
        "description": "Biri sana itiraf etti. Kalbin hızlı atıyor. Ne cevap vereceksin?",
        "icon": "❤️",
        "conditions": {"age_min": 13, "age_max": 19, "no_spouse": True},
        "choices": [
            {"text": "Kabul et", "effects": {"charisma": 1, "fame": 3}, "result": "Gözlerin parladı. Şehirde herkes öğrendi, adın duyuldu."},
            {"text": "Nazikçe reddet", "effects": {"honor": 2, "reputation": 2}, "result": "Kibar davrandın. Karşındaki saygısını korudu, sen de kendi saygınlığını."},
            {"text": "Dalga geç ve küçümse", "effects": {"crime": 1, "reputation": -5, "fear": 2}, "result": "Zalimce davrandın. O kişi seni affetmeyecek."}
        ]
    },
    {
        "id": "event_gang_recruit",
        "title": "Çete Teklifi",
        "description": "Mahalle çetesinden biri seni yanlarına çağırıyor. 'Kolay para' diyor.",
        "icon": "🗡️",
        "conditions": {"age_min": 13, "age_max": 19},
        "choices": [
            {"text": "Katıl", "effects": {"crime": 20, "money": 50, "wanted_in_current": True}, "result": "Para geldi ama hayatın artık tehlikeli. Gardiyanlar seni tanıyor."},
            {"text": "Reddet", "effects": {"reputation": 5, "crime": 3}, "result": "Ret cevabın hoş karşılanmadı. Biraz tehdit aldın ama dik durdun."},
            {"text": "Düşünmek için zaman iste", "effects": {"intelligence": 1}, "result": "Zaman kazandın. En azından şimdilik tehlikeden uzaktasın."}
        ]
    },
    {
        "id": "event_scholarship",
        "title": "Burs Fırsatı",
        "description": "Bir tüccar, şehirdeki okula zeki çocuklar göndermek istiyor. Seni seçtiler.",
        "icon": "📜",
        "conditions": {"age_min": 13, "age_max": 19},
        "choices": [
            {"text": "Hevesle başvur", "effects": {"intelligence": 2, "money": 100}, "result": "Kabul edildin! Şehirde okumak hayatını değiştirecek."},
            {"text": "Ailenin isteğiyle reddet", "effects": {"honor": -2}, "result": "Ailen sevinçle karşıladı ama sen içten içe üzüldün."},
            {"text": "Aileden gizli başvur", "effects": {"intelligence": 2, "charisma": 1, "reputation": -3}, "result": "Başvurdun ve kabul edildin. Ama ailen öğrenince büyük tartışma çıktı."}
        ]
    },
    {
        "id": "event_drug_offer",
        "title": "Tehlikeli Teklif",
        "description": "Bir tanıdığın garip bir şey uzatıyor. 'Dene, iyi gelir' diyor.",
        "icon": "⚠️",
        "conditions": {"age_min": 13, "age_max": 19},
        "choices": [
            {"text": "Kabul et", "effects": {"health": -10, "crime": 5}, "result": "Pişman oldun. Vücudun bozuldu ve tehlikeli insanlarla temas kurmuş oldun."},
            {"text": "Sert bir şekilde reddet", "effects": {"honor": 3}, "result": "Doğru yaptın. O kişi bir daha uğramadı."},
            {"text": "İhbar et", "effects": {"crime": -5, "reputation": 5, "charisma": -1}, "result": "Gardiyanlar harekete geçti. Ama 'muhbir' damgası yeni sorunlar çıkardı."}
        ]
    },
    {
        "id": "event_protest",
        "title": "Sokak Protestosu",
        "description": "Şehirde büyük bir gösteri var. İnsanlar adaletsizliğe karşı yürüyor.",
        "icon": "✊",
        "conditions": {"age_min": 13, "age_max": 19},
        "choices": [
            {"text": "Katıl ve en önde yürü", "effects": {"fame": 5, "crime": 3, "wanted_in_current": True}, "result": "Adın duyuldu ama yetkililer seni fark etti. Riskli bir şöhret bu."},
            {"text": "Uzaktan izle", "effects": {"intelligence": 1}, "result": "Gördüklerin düşünmeni sağladı. Dünyayı biraz daha anladın."},
            {"text": "Dönüp git", "effects": {"honor": -1}, "result": "Tehlikeden kaçtın ama bazı şeyler için durmak gerekirdi."}
        ]
    },
    {
        "id": "event_witness",
        "title": "Kaza Tanığı",
        "description": "Önünde biri at arabasının altında kaldı, ağır yaralı. İnsanlar donup kaldı.",
        "icon": "💥",
        "conditions": {"age_min": 13, "age_max": 19},
        "choices": [
            {"text": "Hemen yardım et", "effects": {"honor": 5, "stamina": 1, "fame": 3}, "result": "Soğukkanlılığın hayat kurtardı. Herkes görmüştü."},
            {"text": "Çığlık at ve yardım iste", "effects": {"honor": 2, "reputation": 2}, "result": "Doğru insanlar geldi. Durumu kötüleştirmedin."},
            {"text": "Kaç", "effects": {"honor": -10, "crime": 2}, "result": "Tanıklar seni gördü. Vicdan azabı uzun süre peşini bırakmadı."}
        ]
    },
    {
        "id": "event_military_call",
        "title": "Askerlik Çağrısı",
        "description": "Sultanın habercisi köye geldi. 'Savaş zamanı — gençler sıraya!' diye bağırıyor. Adın listede.",
        "icon": "⚔️",
        "conditions": {"age_min": 16, "age_max": 19},
        "choices": [
            {"text": "Gönüllü olarak katıl", "effects": {"combat": 3, "stamina": 2, "fame": 8, "health": -15}, "result": "Savaşı gördün. Çok şey öğrendin, çok şey kaybettin. Ama döndün."},
            {"text": "Sakatmış gibi yap", "effects": {"honor": -5, "intelligence": 1}, "result": "Kaçtın. Ama köyde bazıları bunu bildi ve gözleri senden soğudu."},
            {"text": "Ailenin tek direği olduğunu söyle, muaf tut", "effects": {"charisma": 1, "honor": 2}, "result": "Haberci seni muaf tuttu. Doğruyu söyledin, haksız değildin."}
        ]
    },
    {
        "id": "event_jealousy",
        "title": "Aşk Kıskançlığı",
        "description": "Sevdiğin biriyle ilgilenen başka biri var. Kalbini yakıyor.",
        "icon": "💔",
        "conditions": {"age_min": 13, "age_max": 19, "no_spouse": True},
        "choices": [
            {"text": "Açık sözlü ol, itiraf et", "effects": {"charisma": 2, "fame": 3}, "result": "Cesaretin karşılığını buldu ya da bulmadı — ama en azından içini döktün."},
            {"text": "Rakibini karalamaya çalış", "effects": {"crime": 3, "reputation": -4}, "result": "Yaptığın duyuldu. Hem rakibini hem de sevdiğin kişiyi kaybettin."},
            {"text": "Çekil, onurunu koru", "effects": {"honor": 4, "charisma": 1}, "result": "Acı verdi ama başını dik tuttun. Zamanla geçti."}
        ]
    },
    {
        "id": "event_runaway",
        "title": "Evden Kaçma",
        "description": "Ailen seni bir işe zorluyor. Canın sıkıldı — çantayı topla, git!",
        "icon": "🏃",
        "conditions": {"age_min": 13, "age_max": 19},
        "choices": [
            {"text": "Gerçekten kaç, yeni şehre git", "effects": {"stamina": 2, "charisma": 1, "reputation": -5, "money": -20}, "result": "Özgürlük tattın. Ama yalnızdın, paranı çabuk bitirdin ve bir süre zorlandın."},
            {"text": "Biraz yürü, sakin ol, geri dön", "effects": {"intelligence": 2}, "result": "Kafan duruldu. Eve döndüğünde daha sakin bir yüzle konuştun."},
            {"text": "Bir yakına sığın, durumu anlat", "effects": {"social": 2, "charisma": 1}, "result": "Akıldan yakın amcanın evi sığınak oldu. Ailenle arabuluculuk yaptı."}
        ]
    },
    {
        "id": "event_secret_society",
        "title": "Gizli Örgüt Daveti",
        "description": "Gece sana mühürlü bir zarf bıraktılar. 'Bilge Kardeşler seni bekliyor' yazıyor.",
        "icon": "🦉",
        "conditions": {"age_min": 14, "age_max": 19},
        "choices": [
            {"text": "Gizlice buluşmaya git", "effects": {"intelligence": 2, "crime": 5, "social": 2}, "result": "Karanlık bir bodrum. Bilge adamlar. Yasak kitaplar. Hayatın değişti."},
            {"text": "Zarfı yak, unut", "effects": {"honor": 3}, "result": "Tehlikeden uzak durdun. Ama merak hep içinde kaldı."},
            {"text": "Gardiyana götür", "effects": {"reputation": 5, "crime": -3, "wanted_in_current": True}, "result": "Gardiyan heyecanlandı. Ama örgüt seni buldu ve hedef aldı."}
        ]
    },
    {
        "id": "event_traveling_merchant",
        "title": "Gezgin Tüccar",
        "description": "Kervanla bir tüccar geçiyor. 'Genç bir yardımcıya ihtiyacım var, katılmak ister misin?' diyor.",
        "icon": "🐪",
        "conditions": {"age_min": 14, "age_max": 19},
        "choices": [
            {"text": "Katıl, dünyayı gör", "effects": {"trade": 2, "charisma": 1, "money": 50, "stamina": 1}, "result": "Üç ay boyunca şehir şehir gezip bağ kurdun. Döndüğünde farklı bir insandın."},
            {"text": "Hayır, aile beni bekliyor", "effects": {"honor": 2}, "result": "Tüccar anladı ve ayrıldı. Sen yerinde kaldın."},
            {"text": "Tek bir şehre kadar git, dön", "effects": {"trade": 1, "intelligence": 1, "money": 15}, "result": "Kısa bir macera, büyük bir deneyim. İki haftada çok şey öğrendin."}
        ]
    },
    {
        "id": "event_poetry_contest",
        "title": "Şiir Yarışması",
        "description": "Kasaba meydanında şiir yarışması var. Bir arkadaşın 'Sen yaza bilirsin!' diye ısrar ediyor.",
        "icon": "📖",
        "conditions": {"age_min": 13, "age_max": 19},
        "choices": [
            {"text": "Katıl, en iyi şiirini yaz", "effects": {"charisma": 2, "fame": 5, "intelligence": 1}, "result": "Birinci olmadın ama herkes adını öğrendi."},
            {"text": "Katıl ama çok gergin", "effects": {"charisma": 1, "intelligence": 1}, "result": "Titreyerek okudun. Alkış aldın. Bir dahaki sefere daha iyi olacaksın."},
            {"text": "Katılma, utanırsın", "effects": {"honor": -1}, "result": "Pişman oldun. O gün meydanda durabilmeliydin."}
        ]
    },
    {
        "id": "event_first_duel",
        "title": "İlk Düello",
        "description": "Biri onurunu zedeleyen bir şey söyledi. Arkadaşların 'Hesap sor!' diye baskı yapıyor.",
        "icon": "🤺",
        "conditions": {"age_min": 15, "age_max": 19},
        "choices": [
            {"text": "Düelloya kabul et", "effects": {"combat": 2, "stamina": 1, "fame": 4, "health": -20}, "result": "Kan döküldü. Kazandın ya da kaybettin ama kimse sana hafifçe bakmadı."},
            {"text": "Sözle hesap sor, geri adım attır", "effects": {"charisma": 2, "reputation": 3}, "result": "Gözlerine bakarak konuştun. Karşındaki önce salladı, sonra çekildi."},
            {"text": "Affet, geç", "effects": {"honor": -3, "intelligence": 2}, "result": "Bilge bir seçimdi belki — ama arkadaşların hayal kırıklığını saklayamadı."}
        ]
    },
    {
        "id": "event_forbidden_book",
        "title": "Yasaklı Kitap",
        "description": "Bir kitapçıda gizlice sana bir kitap uzatıldı. Kapağında 'Bu kitabı sakın okuma' yazıyor.",
        "icon": "📕",
        "conditions": {"age_min": 13, "age_max": 19},
        "choices": [
            {"text": "Oku, merak dayanılmaz", "effects": {"intelligence": 3, "crime": 5}, "result": "Saatler içinde bitirdin. Dünya hakkındaki her şeyi sorguladın."},
            {"text": "Yak, tehlikeli", "effects": {"honor": 2}, "result": "Kitabı yakmadan önce birkaç satır okudun. Yeterliydi."},
            {"text": "Sat, para eder", "effects": {"money": 30, "trade": 1, "crime": 3}, "result": "Koleksiyonere sattın. İyi para etti."}
        ]
    },
    {
        "id": "event_plague_village",
        "title": "Köye Veba Geldi",
        "description": "Yakın bir köyde veba başladı. İnsanlar bölgeden kaçıyor. Birkaç ailen oraya girecek.",
        "icon": "🦠",
        "conditions": {"age_min": 13, "age_max": 19},
        "choices": [
            {"text": "Ailenle git ve hastalara yardım et", "effects": {"honor": 8, "health": -20, "fame": 5}, "result": "Hayatını riske attın. Bazı insanları kurtardın. Herkes seni saydı."},
            {"text": "Git ama uzakta dur, sadece yiyecek bırak", "effects": {"honor": 4, "health": -5}, "result": "İhtiyatlı ama yardımsever. Orta yolu buldun."},
            {"text": "Gitme, kendini koru", "effects": {"health": 5, "honor": -5}, "result": "Güvende kaldın ama bazı yüzler sana farklı baktı."}
        ]
    },
    {
        "id": "event_horse_race",
        "title": "At Yarışı Bahsi",
        "description": "Bayram yarışında herkes bahis oynuyor. Kazanırsan iyi para var ama kaybedersen...",
        "icon": "🐎",
        "conditions": {"age_min": 13, "age_max": 19},
        "choices": [
            {"text": "Büyük bahse gir — 30 altın", "effects": {"money": 60, "trade": 1}, "result": "Şans seninleydi — iki katı geldi."},
            {"text": "Küçük bahis — 5 altın", "effects": {"money": 8, "trade": 1}, "result": "Temkinli oynadın. Küçük kazanç, sıfır kayıp."},
            {"text": "Oynamadan izle", "effects": {"intelligence": 1}, "result": "Seyircinin en zevkli konumdayken olduğunu keşfettin."}
        ]
    },
    {
        "id": "event_kidnap_attempt",
        "title": "Kaçırılma Girişimi",
        "description": "Tenha bir sokakta iki adam önünü kesiyor. Çuvallı elleri var.",
        "icon": "😱",
        "conditions": {"age_min": 13, "age_max": 19},
        "choices": [
            {"text": "Bağır ve kaç", "effects": {"stamina": 2, "health": -5, "fame": 3}, "result": "Hayatın boyunca koşmamıştın bu kadar. Kurtuldun."},
            {"text": "Direnip savaş", "effects": {"combat": 2, "health": -20, "stamina": 1}, "result": "Yara aldın ama birini yere serdin. Diğeri kaçtı."},
            {"text": "Konuş, zaman kazan", "effects": {"charisma": 2, "intelligence": 2}, "result": "Konuşarak adam kafasını karıştırdın. Geçen bir grupla beraber kurtuldun."}
        ]
    },
    {
        "id": "event_apprentice_offer",
        "title": "Usta Arayışı",
        "description": "Kasabanın en ünlü ustası seni çıraklık için istedi. Beş yıl sürer, zor ama değerli.",
        "icon": "🛠️",
        "conditions": {"age_min": 14, "age_max": 19},
        "choices": [
            {"text": "Kabul et, beş yıl çalış", "effects": {"crafting": 3, "trade": 1, "money": 40, "stamina": 2}, "result": "Beş yıl geçti. Usta seni onurlandırdı. Artık kendin usta sayılıyordun."},
            {"text": "Bir yıl dene, bakarsın", "effects": {"crafting": 1, "stamina": 1}, "result": "Bir yıl çalıştın. İşin temelini öğrendin. Sonra kendi yolunu seçtin."},
            {"text": "Reddet, başka planların var", "effects": {"intelligence": 1}, "result": "Usta anladı. Kapı açık kalacağını söyledi."}
        ]
    },

    # ─────────────────────────────────────────
    # 🧔 YETİŞKİNLİK  (20–35)  — 6 event
    # ─────────────────────────────────────────
    {
        "id": "event_job_offer",
        "title": "İki Ayrı İş Teklifi",
        "description": "Aynı gün iki farklı işveren seni istedi. İkisi de bekliyor.",
        "icon": "💼",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Yüksek maaşlı ama riskli iş (lord hizmetinde)", "effects": {"money": 100, "crime": 5, "fear": 3}, "result": "Para geldi ama lordun istekleri seni rahatsız etti."},
            {"text": "Güvenli zanaatkar işi", "effects": {"money": 30, "crafting": 1}, "result": "Mütevazı ama dürüst bir kazanç."},
            {"text": "İkisini de reddet, bağımsız kal", "effects": {"trade": 1, "honor": 3}, "result": "Özgürlük seçtin. Zor ama kendi patronunsun."}
        ]
    },
    {
        "id": "event_business_opp",
        "title": "Yatırım Fırsatı",
        "description": "Güvenilir bir tüccar ortaklık teklif ediyor. 50 altın sermaye lazım.",
        "icon": "📈",
        "conditions": {"age_min": 20, "age_max": 35, "money_min": 50},
        "choices": [
            {"text": "50 altınla ortak ol", "effects": {"money": 100, "trade": 1}, "result": "Şans güldü! Ticaret karlı geçti. 100 altın geri döndü."},
            {"text": "100 altınla büyük gir", "effects": {"money": 300, "trade": 2}, "result": "Cesur hamle karşılığını verdi. Şehirde tanınan bir tüccar oldun."},
            {"text": "Reddet, risksiz kal", "effects": {"trade": 1}, "result": "Paranı korudun. Belki bir sonraki fırsat daha iyidir."}
        ]
    },
    {
        "id": "event_robbery",
        "title": "Yol Soygunu",
        "description": "Issız bir yolda silahlı bir adam önünü kesiyor. 'Para ya da can' diyor.",
        "icon": "🔪",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Her şeyi ver", "effects": {"money": -80, "health": -5, "honor": -3}, "result": "Para gitti ama hayatta kaldın."},
            {"text": "Direniş göster", "effects": {"health": -25, "combat": 1, "stamina": 1}, "result": "Ağır yara aldın ama kaçmasını sağladın."},
            {"text": "Bağır, yardım iste", "effects": {"money": -30, "health": -10, "reputation": 2}, "result": "Bir yolcu duydu ve koştu. Soyguncu kaçtı."}
        ]
    },
    {
        "id": "event_political_recruit",
        "title": "Siyasi Teklif",
        "description": "Bir faction temsilcisi seni danışman olarak istiyor. 'Büyük güç' vaat ediyor.",
        "icon": "👑",
        "conditions": {"age_min": 20, "age_max": 35, "reputation_min": 20},
        "choices": [
            {"text": "Kabul et", "effects": {"fame": 10, "reputation": 10, "money": 50}, "result": "Sarayda adın geçmeye başladı. Güç hem çekici hem tehlikeli."},
            {"text": "Reddet", "effects": {"honor": 2}, "result": "Bağımsız kaldın. Temsilci hayal kırıklığıyla ayrıldı."},
            {"text": "Pazarlık yap", "effects": {"money": 50, "trade": 1, "charisma": 1}, "result": "Daha iyi koşullar kopardın. Hem para hem biraz güç kazandın."}
        ]
    },
    {
        "id": "event_dispute",
        "title": "Komşu Anlaşmazlığı",
        "description": "Komşun arazi sınırı yüzünden kapına dayandı. Sesi tüm mahalle duyuyor.",
        "icon": "🏠",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Adaletli çöz, ortadan böl", "effects": {"honor": 5, "reputation": 3}, "result": "Komşuyla barış yaptın. Mahalle saygınlığın arttı."},
            {"text": "Kendi çıkarını gözet", "effects": {"money": 20, "reputation": -5}, "result": "Daha fazla toprak aldın ama komşu düşman kesildi."},
            {"text": "Lordu hakem tut", "effects": {"money": -20, "honor": 3}, "result": "Mahkeme masraflıydı ama karar tarafsız verildi."}
        ]
    },
    {
        "id": "event_theft_accusation",
        "title": "Hırsızlık Suçlaması",
        "description": "Bir tüccar seni alenen suçladı: 'Bu adam malımı çaldı!' Çarşı durdu, herkes bakıyor.",
        "icon": "⚖️",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Savun kendini, tanık iste", "effects": {"charisma": 2, "reputation": 4, "intelligence": 1}, "result": "Tanıklar haklı olduğunu doğruladı. Tüccar özür dilemek zorunda kaldı."},
            {"text": "Susup kabul et, çabuk bit", "effects": {"honor": -8, "money": -30}, "result": "Para ödedin, kurtuldun. Ama suçsuz olduğun halde eğilmek içini yaktı."},
            {"text": "Tüccara karşı dava aç", "effects": {"money": -40, "reputation": 8, "honor": 5}, "result": "Davayı kazandın ve tazminat aldın. Adın temizlendi."}
        ]
    },

    # ─────────────────────────────────────────
    # 🧓 OLGUNLUK  (35–60)  — mevcut 3 event korundu
    # ─────────────────────────────────────────
    {
        "id": "event_health_crisis",
        "title": "Ciddi Teşhis",
        "description": "Şehir hekimi yüzünü ekşitti. 'Dinlenmezsen bu işin sonu iyi olmaz' dedi.",
        "icon": "🏥",
        "conditions": {"age_min": 35, "age_max": 999, "health_max": 60},
        "choices": [
            {"text": "Pahalı tedaviyi yaptır", "effects": {"money": -200, "health": 30}, "result": "Kasayı boşalttı ama nefes almak kolaylaştı."},
            {"text": "Şifalı otlar ile idare et", "effects": {"money": -30, "health": 10}, "result": "Biraz toparlandın. Tam çözüm değil ama bir süre idare eder."},
            {"text": "İnkar et, devam et", "effects": {"health": -10, "stamina": -1}, "result": "Vücudun sinyaller vermeye devam etti. Durumun kötüleşti."}
        ]
    },
    {
        "id": "event_inheritance_dispute",
        "title": "Miras Kavgası",
        "description": "Bir akraban öldü. Miras paylaşımında herkes anlaşmazlığa düştü.",
        "icon": "⚖️",
        "conditions": {"age_min": 35, "age_max": 999},
        "choices": [
            {"text": "Hakkaniyetli böl", "effects": {"honor": 8, "reputation": 5, "money": 50}, "result": "Herkes sana hak verdi. Aile birliği korundu."},
            {"text": "Daha fazlasını talep et", "effects": {"money": 150, "honor": -10}, "result": "Para kazandın ama aile bağın zedelendi."},
            {"text": "Her şeyi reddet, mirastan vazgeç", "effects": {"honor": 15, "reputation": 8}, "result": "Dürüstlüğün efsaneleşti. Herkes seni farklı gözle gördü."}
        ]
    },
    {
        "id": "event_midlife",
        "title": "Orta Yaş Krizi",
        "description": "Her şeyi sorgulamaya başladın. Yaptıklarını mı, yapmadıklarını mı?",
        "icon": "🌅",
        "conditions": {"age_min": 40, "age_max": 999},
        "choices": [
            {"text": "Yeni bir hobiye başla", "effects": {"intelligence": 1, "fame": 5, "money": -30}, "result": "Ressam oldun, ya da şair. Hayat yeniden anlam kazandı."},
            {"text": "Her şeyi bırak, yeni şehre git", "effects": {"stamina": 1, "charisma": 1, "reputation": -5}, "result": "Yeni başlangıç korkutucu ama heyecan verici."},
            {"text": "Geçmişinle yüzleş, bir bilgeye danış", "effects": {"honor": 5, "charisma": 1, "money": -50}, "result": "Bilge seni dinledi ve sorular sordu. Cevapları kendi içinde buldun."}
        ]
    },

    # ─────────────────────────────────────────────────────────────
    # 🧔 YETİŞKİNLİK (20–35) — EK 24 EVENT
    # ─────────────────────────────────────────────────────────────

    {
        "id": "event_drought_disaster",
        "title": "Kuraklık Felaketi",
        "description": "Üç aydır yağmur yağmadı. Mahsul kurudu, köylüler açlıktan kırılıyor. Herkes senden bir şeyler bekliyor.",
        "icon": "☀️",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Kendi ambarını aç, herkese dağıt", "effects": {"money": -80, "reputation": 15, "honor": 10, "fame": 5}, "result": "Yiyeceğini paylaştın. Halk seni kurtarıcı ilan etti; adın şehirden şehire yayıldı."},
            {"text": "Komşu şehirden pahalıya tahıl satın al, sat", "effects": {"money": 50, "trade": 2, "reputation": -8, "honor": -5}, "result": "Kazandın ama 'açlıktan kazanç sağlayan' damgası yapıştı."},
            {"text": "Beye durumu bildir, devlet yardımı iste", "effects": {"charisma": 1, "reputation": 3, "intelligence": 1}, "result": "Bey haftalarca sonra biraz tahıl gönderdi. Geç ama çözüm devletten geldi."}
        ]
    },
    {
        "id": "event_debt_trap",
        "title": "Borç Tuzağı",
        "description": "Tefeci Harun seni köşeye sıkıştırdı: 'Sana borç vermiştim, faizleriyle 200 altın borcun var. Öde ya da mülkünü al.' Sen böyle bir borç almadın.",
        "icon": "📜",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Sahte belgeyi reddet, mahkemeye git", "effects": {"reputation": 8, "honor": 5, "intelligence": 2, "money": -20}, "result": "Dava uzun sürdü ama hakikati ortaya çıkardın. Harun şehirden kovuldu."},
            {"text": "Gizlice öde, kurtul", "effects": {"money": -200, "honor": -5}, "result": "200 altın gitti. Rahatladın ama Harun bir sonraki kurbanı bulmaya devam etti."},
            {"text": "Tefeciye gece bir ziyaret yap", "effects": {"crime": 10, "fear": 5, "honor": -8, "money": 50}, "result": "Korkuttun, belgeyi yaktırdın. Ama artık sen de çizgiyi aştın."}
        ]
    },
    {
        "id": "event_runaway_slave",
        "title": "Kaçak Köle",
        "description": "Gece kapına hafif bir tıkırtı geldi. Zincir izleri taşıyan genç bir adam kapıda duruyor: 'Lütfen, beni saklayın. Ustam beni öldürecek.'",
        "icon": "⛓️",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "İçeri al, sakla", "effects": {"honor": 10, "crime": 8, "reputation": -3}, "result": "Adamı sakladın. Ustası seni sorguladı ama kanıtlayamadı. Adam haftalar sonra şehri terk etti."},
            {"text": "Ustasına bildir, ödülü al", "effects": {"money": 40, "honor": -15, "reputation": 5}, "result": "Ödülü aldın ama o geceyi unutamıyorsun. Adam hangi akıbete uğradı bilmiyorsun."},
            {"text": "Azat belgesi yazmasına yardım et", "effects": {"honor": 15, "intelligence": 1, "crime": 5, "reputation": 8}, "result": "Sahte bir azat belgesi hazırladın. Adam özgür yolculuğuna çıktı. Riskliydi ama doğruydu."}
        ]
    },
    {
        "id": "event_assassination_order",
        "title": "Suikast Emri",
        "description": "Gizemli bir adam sana mühürlü bir zarf uzattı. İçinde hedefin adı ve 500 altın: 'Bey falan kişinin ortadan kalkmasını istiyor.' Sen bu işe karışmak zorunda değilsin.",
        "icon": "🗡️",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Reddet ve zarfı geri ver", "effects": {"honor": 10, "reputation": 5}, "result": "Adam soğukça ayrıldı. Tehlike sezdirdin ama kırmızı çizgini korudun."},
            {"text": "Kabul et", "effects": {"money": 500, "crime": 25, "honor": -20, "fame": 5}, "result": "İşi yaptın. Para var, ama artık geri dönüş yok. İlk suikastçı adımını attın."},
            {"text": "Hedefi uyar ve beye ihbar et", "effects": {"reputation": 15, "honor": 15, "fame": 8, "crime": -5}, "result": "Hem hedefi kurtardın hem Beyin güvenini kazandın. Tehlikeli bir oyunun içindesin ama doğru taraftasın."}
        ]
    },
    {
        "id": "event_foreign_merchant",
        "title": "Uluslararası Tüccar",
        "description": "Uzak diyarlardan gelen bir tüccar, senin şehrine yerleşmek istiyor. Senden ortak olmanı teklif etti: 100 altın yatır, getirisi büyük olacak.",
        "icon": "🌍",
        "conditions": {"age_min": 20, "age_max": 35, "money_min": 50},
        "choices": [
            {"text": "Ortaklığı kabul et (100 altın yatır)", "effects": {"money": -100, "trade": 3, "reputation": 5}, "result": "Altı ay sonra 280 altın geri döndü. Tüccar dürüstmüş. Artık uluslararası bir ağın parçasısın."},
            {"text": "Güvenin sonra gelir, daha az yatır (30 altın)", "effects": {"money": -30, "trade": 1}, "result": "Kazancın sınırlı kaldı ama kayıp da az. Tüccar anladı, ilerleyen seferler için davet bekliyorsun."},
            {"text": "Reddет, benim işim yerel", "effects": {"intelligence": 1}, "result": "Yabancıya güvenmedin. Tüccar başkasıyla ortaklık kurdu ve çok kazandı. Fırsatı kaçırdın."}
        ]
    },
    {
        "id": "event_fake_will",
        "title": "Sahte Vasiyetname",
        "description": "Ölen zengin amcanın vasiyetnamesi ortaya çıktı; mülkün tamamını uzak bir akrabaya bırakmış. Belge sahte görünüyor ama kanıtlamak zor.",
        "icon": "📄",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Hukuki yola git, katip ve şahit bul", "effects": {"money": -50, "intelligence": 2, "reputation": 5}, "result": "Uzun uğraşların ardından vasiyetin sahte olduğu ispat edildi. Mülk ailenize geçti."},
            {"text": "Akrabayı doğrudan yüzleş", "effects": {"charisma": 1, "strength": 1, "honor": 3}, "result": "Adam şaşırdı, zorlandı ama geri çekildi. Sessiz bir anlaşma yapıldı."},
            {"text": "Bırak, kavgaya değmez", "effects": {"honor": -5, "reputation": -3}, "result": "Mülkü kaybettin. Aile sana kırgın baktı uzun süre."}
        ]
    },
    {
        "id": "event_tavern_brawl",
        "title": "Meyhane Kavgası",
        "description": "Meyhanede bir grup sarhoş, masandaki arkadaşına saldırmaya başladı. Sen ortada kaldın.",
        "icon": "🍺",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Arkadaşını koru, kavgaya gir", "effects": {"strength": 1, "health": -15, "honor": 5, "social": 1}, "result": "Yumruklar yedik ama arkadaşını korudun. O bunu ömrü boyunca unutmayacak."},
            {"text": "Barmene koş, yardım iste", "effects": {"charisma": 1, "reputation": 2}, "result": "Barmen ve garsonlar kavgayı dağıttı. Kimse yaralanmadı."},
            {"text": "Çık git, senin işin değil", "effects": {"honor": -5, "social": -1}, "result": "Arkadaşın yaralandı. Sana bir daha güvenmedi."}
        ]
    },
    {
        "id": "event_caravan_guard",
        "title": "Kervan Koruyuculuğu",
        "description": "Tüccar Mirza, uzun bir yolculuk için deneyimli koruyucular arıyor. Tehlikeli yol ama ödeme iyi.",
        "icon": "🐪",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Kabul et, yola çık", "effects": {"money": 120, "combat": 2, "stamina": 1, "health": -10}, "result": "İki haftalık zorlu yolculuk. Üç saldırıyı püskürttünüz, kervan sağ ulaştı. Mirza memnun."},
            {"text": "Ücret pazarlığı yap, daha fazla iste", "effects": {"money": 200, "trade": 1, "charisma": 1}, "result": "Mirza direndi ama sen kazandın: 200 altın. İyi bir pazarlıkçısın."},
            {"text": "Reddet, seyahat istemiyorum", "effects": {}, "result": "Şehirde kaldın. Sıradan haftalar geçti."}
        ]
    },
    {
        "id": "event_spy_offer",
        "title": "Casus Teklifi",
        "description": "Gizemli bir kadın sana yaklaştı: 'Biz sizi izliyoruz. Yetenekleriniz bizi etkiledi. Krallık için çalışır mısınız?' Casusluğu teklif ediyor.",
        "icon": "🕵️",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Kabul et, casusluğa başla", "effects": {"intelligence": 2, "charisma": 1, "crime": 5, "fame": -3}, "result": "Çifte hayat başladı. Aylık ödeme geliyor ama her adımını düşünmek zorundasın."},
            {"text": "Reddet ama kimseye söyleme", "effects": {"honor": 5, "intelligence": 1}, "result": "Kadın anladı ve ayrıldı. Sırrı korudun. Belki bir gün yeniden gelirler."},
            {"text": "Yetkililere ihbar et", "effects": {"reputation": 10, "fame": 5, "honor": 8, "crime": -5}, "result": "Beyin muhafızları kadını yakaladı. Ödüllendirildin."}
        ]
    },
    {
        "id": "event_new_faith",
        "title": "Yeni İnanç",
        "description": "Şehre yeni bir gezgin derviş geldi. Vaazları çok etkileyici; bazı komşuların onun tarikatına katılmaya başladı. Seni de çağırdılar.",
        "icon": "🕌",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Toplantıya katıl ve dinle", "effects": {"intelligence": 1, "charisma": 1, "reputation": 2}, "result": "Düşündürücü fikirler duydun. Katılmadın ama zihnin açıldı."},
            {"text": "Tarikata katıl", "effects": {"honor": 5, "social": 2, "money": -30, "fame": 3}, "result": "Yeni bir topluluk edindim. Aidatı var ama manevi doyum büyük."},
            {"text": "Şüpheyle yaklaş, araştır", "effects": {"intelligence": 2, "reputation": -2}, "result": "Araştırdın. Derviş gerçekten inançlı biri ama bazı takipçileri saf ve kolay manipüle edilebilir."}
        ]
    },
    {
        "id": "event_murder_accusation",
        "title": "Cinayet İftirası",
        "description": "Sabah şehir nöbetçileri kapını çaldı: 'Dün gece işlenen cinayetin faili olarak adınız geçiyor.' Sen o gece evindeydin.",
        "icon": "⚖️",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Alibini ispat et, şahit bul", "effects": {"intelligence": 2, "reputation": 5, "money": -30}, "result": "Avukat tuttun, şahitler konuştu. Beraat ettin ama herkes hâlâ seni merak ediyor."},
            {"text": "Kaç şehirden", "effects": {"crime": 15, "reputation": -20, "wanted_in_current": True}, "result": "Kaçmak suçlu göründüğün anlamına geldi. Artık bu şehirde arananlar listindesin."},
            {"text": "Gerçek faili bul", "effects": {"intelligence": 3, "combat": 1, "reputation": 15, "fame": 8}, "result": "Tehlikeli bir araştırmaydı. Gerçek faili buldun ve yetkililere teslim ettin. Kahraman oldun."}
        ]
    },
    {
        "id": "event_arson",
        "title": "Yangın Çıkarma",
        "description": "Rakibin Selim'in ahırı, senin çiftliğinin duvarı dibinde yanmaya başladı. Rüzgar varsa senin çiftliğine sıçrar.",
        "icon": "🔥",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Kova kova su taşı, söndür", "effects": {"health": -10, "stamina": 1, "reputation": 8, "honor": 5}, "result": "Gecenin ilerleyen saatlerinde yangını söndürdünüz. Rakibin bile minnettar kaldı."},
            {"text": "Kendi evini kurtar, onunkini bırak", "effects": {"honor": -5, "money": 20}, "result": "Selim'in ahırı yandı. Çiftliğin kurtuldu. Ama bu sefer 'senin başından bela oldu' dediler."},
            {"text": "Yangına seyret, sigorta tazminatı düşün", "effects": {"crime": 5, "honor": -10, "money": 30}, "result": "Sigorta tazminatı aldın ama komşular senden şüpheleniyor. Kötü bir itibar aldın."}
        ]
    },
    {
        "id": "event_orphan_child",
        "title": "Yetim Çocuk",
        "description": "Salgın hastalıktan ölen çiftin tek çocuğu olan 5 yaşındaki Hasan kapında kaldı. Hiç kimsesi yok.",
        "icon": "🧒",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Evine al, büyüt", "effects": {"honor": 15, "money": -50, "reputation": 10, "social": 2}, "result": "Hasan senin evinde büyüdü. Bir gün sana büyük bir sadakatle hizmet etti."},
            {"text": "Yetimhaneye ilet, para ver", "effects": {"honor": 5, "money": -20, "reputation": 3}, "result": "Sorumluluğu aldın ama uzaktan. Hasan güvende."},
            {"text": "Gönder, senin derdin değil", "effects": {"honor": -10, "reputation": -5}, "result": "Kapıyı kapattın. Hasan ne oldu bilmiyorsun. Ama vicdanın sızlıyor."}
        ]
    },
    {
        "id": "event_blackmail",
        "title": "Şantaj",
        "description": "Birisi senin geçmişindeki bir hatanı biliyor. Mektup geldi: '50 altın öde, yoksa herkese anlatırım.'",
        "icon": "✉️",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Öde ve kurtar", "effects": {"money": -50, "honor": -3}, "result": "Ödeme yaptın. Birkaç ay sessizlik oldu. Ama tekrar gelecek mi bilmiyorsun."},
            {"text": "Ret et ve halka kendin anlat", "effects": {"reputation": -5, "honor": 10, "charisma": 1}, "result": "Önce tepkiler sertti ama dürüstlüğün sonunda güven kazandırdı. Şantajcı etkisini yitirdi."},
            {"text": "Şantajcıyı bul ve sustur", "effects": {"crime": 10, "fear": 8, "intelligence": 1}, "result": "Adamı buldun ve korkutman yetti. Bir daha gelmedi. Ama sen de bir sınır aştın."}
        ]
    },
    {
        "id": "event_cursed_item",
        "title": "Lanetli Eşya",
        "description": "Eski bir tüccardan ucuza aldığın antika bıçağın etrafında garip şeyler oluyor. Hayvanlar kaçıyor, süt ekşiyor. Halk lanetli diyor.",
        "icon": "🗡️",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Şifacıya götür, ritüel yaptır", "effects": {"money": -25, "honor": 3, "fear": -10}, "result": "Şifacı bazı şeyler yaptı. Garip olaylar durdu. İnanç mı, tesadüf mü bilmiyorsun."},
            {"text": "Sat, başka birine ver", "effects": {"money": 15, "honor": -5, "crime": 3}, "result": "Problemi başkasına aktardın. Biraz para kazandın ama bunu hep düşündün."},
            {"text": "Araştır, tarihini öğren", "effects": {"intelligence": 3, "fame": 3}, "result": "Bıçağın 200 yıllık bir savaş kalıntısı olduğunu öğrendin. Müzeye bağışladın, adın bir levhada yazdı."}
        ]
    },
    {
        "id": "event_flood",
        "title": "Sel Felaketi",
        "description": "Kış yağmurları nehri taşırdı. Köyün alt mahallesi su altında, insanlar çatılara sığınmış.",
        "icon": "🌊",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Kurtarma ekibi oluştur, öncülük et", "effects": {"health": -10, "reputation": 20, "honor": 15, "stamina": 1}, "result": "On iki kişiyi kurtardın. Halk seni yıllarca anlattı. Bir günde efsane oldun."},
            {"text": "Malzeme ve çadır organize et", "effects": {"trade": 1, "intelligence": 1, "reputation": 10, "money": -40}, "result": "Koordinasyon iyiydi. Kurtarma düzenli yapıldı, can kaybı az oldu."},
            {"text": "Kendin ve ailen güvende, yeter", "effects": {"honor": -5, "reputation": -5}, "result": "Güvende kaldın. Ama başkaları seni bu seçimle tanımladı."}
        ]
    },
    {
        "id": "event_early_inheritance",
        "title": "Erken Miras",
        "description": "Yaşlı babanın sağlığı bozuldu. Noterle konuşmaya çağırdı: mülkünü şimdi mi paylaşsın, ölünce mi?",
        "icon": "🏠",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Şimdi al, haklarını güvence altına al", "effects": {"money": 150, "honor": -5, "reputation": -3}, "result": "Para ve mülk sende. Ama kardeşlerin 'sabırsızlandın' dedi."},
            {"text": "Bekle, babana saygı duy", "effects": {"honor": 10, "reputation": 8, "social": 1}, "result": "Sabrettim. Baban seni çok takdir etti, vasiyet seni kayırdı."},
            {"text": "Eşit paylaşım öner, adil kal", "effects": {"honor": 15, "reputation": 10, "charisma": 1}, "result": "Adalet içinde çözüldü. Aile barışı korundu."}
        ]
    },
    {
        "id": "event_tournament",
        "title": "Büyük Turnuva",
        "description": "Şehirde beş yılda bir düzenlenen büyük savaş turnuvası başlıyor. Şampiyona 500 altın ve Beyin onuru var.",
        "icon": "🏆",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Katıl, şampiyonluğa oyna", "effects": {"health": -15, "combat": 3, "stamina": 1, "fame": 10, "money": 100}, "result": "Finale kadar gelebildin. Şampiyon olamadın ama halk senin adını bağırdı. 100 altın ikramiye aldın."},
            {"text": "Bahse gir, iyi bir ata yatır", "effects": {"money": 80, "trade": 1}, "result": "Doğru atı seçtin. Bahis kazandın. Savaşmadan para kazanmak da bir sanattır."},
            {"text": "İzle, keyif çıkar", "effects": {"social": 1}, "result": "Harika bir gösteri izledin. Yeni insanlarla tanıştın. Keyifli bir hafta geçti."}
        ]
    },
    {
        "id": "event_epidemic",
        "title": "Salgın Hastalığı",
        "description": "Şehirde gizemli bir hastalık yayılıyor. Her gün yeni hastalar. Tabip tahta kapıya tebeşirle 'Hasta ev' yazmaya başladı.",
        "icon": "🦠",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Tabibi destekle, ilaç ve para ver", "effects": {"money": -60, "reputation": 12, "honor": 8, "health": -5}, "result": "Birlikte salgını yavaşlattınız. Tabip teşekkür belgesi yazdı. Adın iyiler listesinde."},
            {"text": "Aileyi al, köyden uzaklaş", "effects": {"health": 10, "honor": -5, "reputation": -8}, "result": "Güvende kaldınız. Ama gidişin 'panikçi' diye anıldı."},
            {"text": "Hastalara yiyecek götür, moral ver", "effects": {"health": -20, "honor": 15, "social": 2, "reputation": 10}, "result": "Hastalandın ama iyileştin. Kurtardıklarından ikisi ömür boyu sana minnettar kaldı."}
        ]
    },
    {
        "id": "event_art_patronage",
        "title": "Sanat Himayesi",
        "description": "Genç bir ressam kapına geldi: 'Sizi ölümsüz kılacak bir eser yapmak istiyorum. Beni destekler misiniz?'",
        "icon": "🎨",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Destekle, büyük yatırım yap (80 altın)", "effects": {"money": -80, "fame": 12, "reputation": 8, "charisma": 1}, "result": "Ressam başyapıt ortaya koydu. Eseri adınla meşhur oldu. İsmin sanatseverler arasında yayıldı."},
            {"text": "Küçük destek ver (20 altın)", "effects": {"money": -20, "reputation": 4, "fame": 3}, "result": "Ressam çalışmalarına devam etti. Eserde adın küçük harflerle geçiyor."},
            {"text": "Reddet, sanat yatırım değil", "effects": {"intelligence": 1}, "result": "Ressam başka bir hami buldu. Eser meşhur oldu, senin adın yok."}
        ]
    },
    {
        "id": "event_rival_merchant",
        "title": "Rakip Tüccar",
        "description": "Yeni bir tüccar senin işini alıyor. Müşterilerini çalıyor, fiyatları kırıyor. Bu öyle devam edemez.",
        "icon": "🏪",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Fiyatlarını düşür, rekabet et", "effects": {"money": -40, "trade": 2, "reputation": 3}, "result": "Uzun fiyat savaşı oldu. Sonunda rakip teslim oldu. Pazar senin."},
            {"text": "Kalitenle fark yarat, sadık müşteri kazan", "effects": {"trade": 3, "charisma": 1, "reputation": 8}, "result": "Ucuz değil, iyi mal sattın. Kısa vadede kayıp vardı ama uzun vadede sen kazandın."},
            {"text": "Rakiple ortaklık teklif et", "effects": {"trade": 2, "social": 1, "money": 60}, "result": "Beklenmedik bir hamle. Rakibin şaşırdı ama kabul etti. İş birliği her ikinize de yarattı."}
        ]
    },
    {
        "id": "event_slave_trafficking",
        "title": "Köle Kaçakçılığı",
        "description": "Gece liman deposunda gizli bir grup insan tutulduğunu öğrendin. Biri sana gelip anlattı.",
        "icon": "🚢",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Yetkililere haber ver", "effects": {"honor": 15, "reputation": 10, "crime": -5, "fame": 5}, "result": "Muhafızlar baskın yaptı. Çete tutuklandı, insanlar kurtarıldı. Sen kahraman oldun."},
            {"text": "Kendisi müdahale et, insanları kurtar", "effects": {"honor": 20, "combat": 2, "health": -20, "crime": 5}, "result": "Tehlikeliydi. Yaralandın ama on ikisini kurtardın. Destansı bir gece."},
            {"text": "Görmezden gel, tehlikeli", "effects": {"honor": -15, "reputation": -5}, "result": "İnsanlar götürüldü. Kaçakçılar kayboldu. Bu anı hep taşıyacaksın."}
        ]
    },
    {
        "id": "event_heist",
        "title": "Büyük Soygun Planı",
        "description": "Eski bir arkadaşın geldi: 'Vali hazinesini boşaltmak için plan yaptım. Sana ihtiyacım var. Risk büyük ama kâr çok büyük.'",
        "icon": "💎",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Katıl, servete ortak ol", "effects": {"money": 400, "crime": 30, "wanted_in_current": True, "honor": -20}, "result": "Soygun başarılı oldu ama yüzünüz görüldü. Artık en çok aranan listindesin."},
            {"text": "Reddet, dürüst yolda kal", "effects": {"honor": 10, "reputation": 3}, "result": "Arkadaşın anladı. Haftalar sonra tutuklandığını duydun. İyi karar vermiştin."},
            {"text": "Planı yetkililere sızdır", "effects": {"money": 100, "crime": -10, "reputation": 10, "honor": 5}, "result": "İhbar ödülü aldın. Arkadaşın tutuklandı. Kolay para ama bu dostluğu bitirdi."}
        ]
    },
    {
        "id": "event_fake_identity",
        "title": "Sahte Kimlik",
        "description": "Bir kolaylık fırsatı çıktı: sahte bir belgeyle kendini farklı biri gibi tanıtsan, büyük bir iş imkânı kapısı açılıyor.",
        "icon": "🎭",
        "conditions": {"age_min": 20, "age_max": 35},
        "choices": [
            {"text": "Sahte kimliği kullan", "effects": {"money": 150, "crime": 15, "honor": -10, "intelligence": 1}, "result": "İş kapıldı, para geldi. Ama bu kimliği ne kadar daha taşıyabilirsin?"},
            {"text": "Kendi adınla git, dürüst ol", "effects": {"honor": 8, "charisma": 2, "reputation": 5}, "result": "Zor yolu seçtin. İş biraz daha uzun sürdü ama gerçek başarı senin."},
            {"text": "Fırsatı geç, risk alma", "effects": {"intelligence": 1}, "result": "Temkinlisin. Başka fırsatlar gelecek."}
        ]
    },

    # ─────────────────────────────────────────────────────────────
    # 🧓 OLGUNLUK (35–60) — EK 22 EVENT
    # ─────────────────────────────────────────────────────────────

    {
        "id": "event_retirement_pressure",
        "title": "Emeklilik Baskısı",
        "description": "Eski arkadaşların birer birer işi bırakıp dinleniyor. Ailene ve kendinize daha fazla zaman ayırman gerekmiyor mu?",
        "icon": "🪑",
        "conditions": {"age_min": 50, "age_max": 60},
        "choices": [
            {"text": "Emekli ol, dinlen", "effects": {"health": 15, "social": 2, "money": -30, "fame": -3}, "result": "Yavaş bir hayat başladı. Sağlığın düzeldi, ama bazen sıkıldığını fark ediyorsun."},
            {"text": "Çalışmaya devam et, henüz erken", "effects": {"money": 60, "stamina": -1, "health": -5}, "result": "Durduramıyorsun. Para geliyor ama vücut yorgunluğunu hissettiriyor."},
            {"text": "Yarı zamanlı geç, dengeyi bul", "effects": {"health": 5, "money": 20, "social": 1}, "result": "Hem dinleniyorsun hem üretiyorsun. Akıllıca bir denge."}
        ]
    },
    {
        "id": "event_child_marriage",
        "title": "Çocuğunun Düğünü",
        "description": "Büyük çocuğun evlenme yaşına geldi. Düğün hazırlıkları başladı. Masraf büyük ama bu gün bir kez gelir.",
        "icon": "💍",
        "conditions": {"age_min": 38, "age_max": 60, "has_children": True},
        "choices": [
            {"text": "Büyük düğün yap, masrafı gör", "effects": {"money": -200, "reputation": 15, "fame": 8, "social": 3}, "result": "Şehir konuştu. Görkemli bir düğündü. Çocuğun gözlerindeki mutluluğu unutamazsın."},
            {"text": "Sade ama anlamlı tut", "effects": {"money": -60, "honor": 8, "reputation": 5}, "result": "Küçük ama samimi bir tören. Herkes memnun, kimsede kırgınlık yok."},
            {"text": "Masrafı paylaş, gelin ailesinden destek iste", "effects": {"money": -80, "trade": 1, "charisma": 1, "reputation": 3}, "result": "Ortak düğün kararı alındı. Akıllıca bir çözüm, iki aile de memnun."}
        ]
    },
    {
        "id": "event_spendthrift_child",
        "title": "Mirasyedi Çocuk",
        "description": "Oğlun / kızın para harcamayı sevdiğini anlıyorsun. Borç bile almaya başlamış. Sormadan ailene ait arazi satmaya kalkıştı.",
        "icon": "💸",
        "conditions": {"age_min": 40, "age_max": 60, "has_children": True},
        "choices": [
            {"text": "Sert konuş, sınır koy", "effects": {"honor": 5, "reputation": 3, "social": -1}, "result": "Kızdı ama anladı. Harcamalar düzeldi. Zor konuşmaydı ama gerekliydi."},
            {"text": "Borcunu öde, bir daha konuş", "effects": {"money": -100, "honor": 3, "social": 1}, "result": "Bu sefer kurtardın. Ama bir daha tekrarlamaması için ciddi konuştunuz."},
            {"text": "Kaderine bırak, öğrensin", "effects": {"honor": -3, "reputation": -2}, "result": "Kendi deneyimiyle öğrendi. Acı bir ders ama kalıcı."}
        ]
    },
    {
        "id": "event_village_headman",
        "title": "Köy Yöneticisi Seçimi",
        "description": "Uzun yıllar burada yaşadın. Köylüler seni muhtarlığa aday gösteriyor. Sorumluluk büyük ama güç de büyük.",
        "icon": "🏛️",
        "conditions": {"age_min": 38, "age_max": 60, "reputation_min": 15},
        "choices": [
            {"text": "Adaylığı kabul et", "effects": {"reputation": 20, "fame": 10, "charisma": 2, "money": -20}, "result": "Seçimi kazandın. Artık bu köyün sesi sensin. Sorumluluk ağır ama şeref büyük."},
            {"text": "Reddet, aday öner", "effects": {"honor": 8, "reputation": 5, "charisma": 1}, "result": "Daha iyi birini önerdim dedin. Halk saygıyla kabul etti. İtibarın arttı."},
            {"text": "Düşün, karar ver", "effects": {"intelligence": 1}, "result": "Bir hafta düşündün ve hayır dedin. Zamanın değil demek ki."}
        ]
    },
    {
        "id": "event_old_enemy",
        "title": "Eski Düşman",
        "description": "Yıllar önce aranda büyük bir hesap kalan adam şehre geri döndü. Bakışlarınız karşılaştı.",
        "icon": "😠",
        "conditions": {"age_min": 35, "age_max": 60},
        "choices": [
            {"text": "Geçmişi göm, barış teklif et", "effects": {"honor": 10, "reputation": 8, "charisma": 2, "fear": -10}, "result": "Adam şaşırdı. Uzun bir suskunluk. Sonra eli uzandı. Yıllar önce başlamış bir anlaşmazlık bitti."},
            {"text": "Hesabı sor, yüzleş", "effects": {"fear": 5, "combat": 1, "reputation": -3}, "result": "Gerginlik yükseldi. Kavga çıkmadı ama gerilim devam ediyor."},
            {"text": "Görmezden gel, uzak dur", "effects": {"honor": -3}, "result": "Birbirinizden kaçıyorsunuz. Şehir küçük, bu zor."}
        ]
    },
    {
        "id": "event_spouse_ill",
        "title": "Eşin Hastalandı",
        "description": "Eşin birkaç haftadır yatakta. Tabip ciddi bir şey olduğunu söyledi. Tedavi masraflı.",
        "icon": "❤️‍🩹",
        "conditions": {"age_min": 35, "age_max": 60, "has_spouse": True},
        "choices": [
            {"text": "Her şeyi sat, en iyi tabibi getirt", "effects": {"money": -250, "honor": 15, "social": 2}, "result": "Şehrin en iyi tabibi geldi. Eşin yavaş yavaş iyileşti. Para gitti ama o kaldı."},
            {"text": "Elinden geleni yap, kendi bakımı ver", "effects": {"health": -5, "honor": 10, "stamina": -1}, "result": "Gece gündüz başında bekledin. Aylarca sürdü. Sevgin en büyük ilaçmış."},
            {"text": "Yerel şifacıyla yetin", "effects": {"money": -40, "honor": 3}, "result": "Şifacı elinden geleni yaptı. Eşin iyileşti ama uzun sürdü."}
        ]
    },
    {
        "id": "event_land_offer",
        "title": "Büyük Arazi Teklifi",
        "description": "Varlıklı bir bey, kasabanın kuzeyindeki büyük araziyi sana satmak istiyor. Fiyat makul ama yatırım büyük.",
        "icon": "🌾",
        "conditions": {"age_min": 35, "age_max": 60, "money_min": 100},
        "choices": [
            {"text": "Satın al, yatırım yap", "effects": {"money": -300, "reputation": 10, "trade": 2, "fame": 5}, "result": "Araziyi aldın. İlk yıl zorlandı ama zamanla değerlendi. Akıllı bir yatırımdı."},
            {"text": "Pazarlık et, indirim iste", "effects": {"money": -180, "trade": 2, "charisma": 1}, "result": "Bey direndi ama sen kazandın. Araziyi daha ucuza aldın."},
            {"text": "Reddet, likit kal", "effects": {"intelligence": 1}, "result": "Başkası aldı ve iki yıl sonra iki katına sattı. Fırsatı kaçırdın ama o anki kararın mantıklıydı."}
        ]
    },
    {
        "id": "event_grandchild_born",
        "title": "Torun Doğdu",
        "description": "Çocuğunun çocuğu dünyaya geldi. Bebeği kucağına aldığında içinde tuhaf bir huzur hissettin.",
        "icon": "👶",
        "conditions": {"age_min": 42, "age_max": 60, "has_children": True},
        "choices": [
            {"text": "Hediyeler ver, büyük kutla", "effects": {"money": -50, "reputation": 8, "social": 3, "fame": 3}, "result": "Tüm köy kutlamaya katıldı. Adın artık 'dede/nine' olarak anılıyor."},
            {"text": "Sessizce sev, yanında ol", "effects": {"honor": 8, "social": 2, "health": 5}, "result": "Büyük gösterişe gerek yoktu. Bebekle geçirdiğin saatler en değerli şeydi."},
            {"text": "Vasiyetini güncelle, geleceği güvence altına al", "effects": {"intelligence": 2, "honor": 5}, "result": "Notere gidip vasiyetini yeniledim. Torunun için bir miktar ayırdın. Öngörülüsün."}
        ]
    },
    {
        "id": "event_partner_betrayal",
        "title": "Ortağın İhaneti",
        "description": "Yıllarca birlikte iş yaptığın ortağın senin müşterilerini arkandan çalıyor, kasadan para sızdırıyor. Yazışmalar elinde.",
        "icon": "🤝",
        "conditions": {"age_min": 35, "age_max": 60},
        "choices": [
            {"text": "Mahkemeye ver, hukuki yoldan git", "effects": {"money": -50, "reputation": 10, "trade": 1, "intelligence": 1}, "result": "Uzun sürdü ama kazandın. Ortağın tazminat ödedi. İtibarın temizlendi."},
            {"text": "Yüzleş, özel hesaplaş", "effects": {"fear": 5, "honor": 3, "money": 60}, "result": "Sert bir yüzleşme oldu. Adam anlaşmaya mecbur kaldı. Sessiz ama etkili bir çözüm."},
            {"text": "Ortaklığı bitir, sessizce ayrıl", "effects": {"honor": -3, "money": -80}, "result": "Kayıpla ayrıldın ama kavga çıkmadı. Bazen sakin çözüm de bir güçtür."}
        ]
    },
    {
        "id": "event_pilgrimage",
        "title": "Hacı Yolculuğu",
        "description": "Ömründe bir kez gitmek istediğin kutsal yere yolculuk zamanı geldi. Uzun, zorlu ama manevi bir yolculuk.",
        "icon": "🕌",
        "conditions": {"age_min": 40, "age_max": 60},
        "choices": [
            {"text": "Yola çık, tek başına", "effects": {"money": -80, "honor": 20, "health": -10, "fame": 8, "stamina": 1}, "result": "Üç aylık zorlu yolculuk. Döndüğünde farklı biriydim dedin. Halk seni 'Hacı' diye andı."},
            {"text": "Kafile ile git, güvenli", "effects": {"money": -120, "honor": 15, "social": 2, "fame": 5}, "result": "Toplu yolculuk daha rahaydı. Yeni insanlarla tanıştın. Ruhun dinlendi."},
            {"text": "Bu yıl değil, daha sonra", "effects": {}, "result": "Ertelendi. Belki bir gün."}
        ]
    },
    {
        "id": "event_plague_city",
        "title": "Veba Şehre Girdi",
        "description": "Komşu şehirden kaçanlar haberi getirdi: veba geliyor. Kapıları kapatmak için halk tartışıyor.",
        "icon": "💀",
        "conditions": {"age_min": 35, "age_max": 60},
        "choices": [
            {"text": "Kapıları kapat, mültecileri alma", "effects": {"reputation": -8, "honor": -5, "health": 15}, "result": "Sert karar ama şehri korudun. Mülteciler dışarıda kaldı. Vicdanın ağır."},
            {"text": "Karantina bölgesi kur, kontrollü al", "effects": {"intelligence": 2, "reputation": 8, "health": -5, "money": -40}, "result": "Akıllıca bir orta yol buldun. Hem insan hem şehir korundu. Liderlik yeteneğin konuşuldu."},
            {"text": "Kapıları aç, insan insan içindir", "effects": {"honor": 15, "reputation": 5, "health": -20}, "result": "Binlerce kişiyi kurtardın. Ama hastalık şehre girdi. Bazı kararların bedeli var."}
        ]
    },
    {
        "id": "event_home_renovation",
        "title": "Ev Yenileme",
        "description": "Yılların yıprattığı ev artık onarım istiyor. Tamirci dedi ki: ya küçük tamir, ya büyük yenileme.",
        "icon": "🏠",
        "conditions": {"age_min": 35, "age_max": 60},
        "choices": [
            {"text": "Büyük yenileme, sıfırdan başla", "effects": {"money": -180, "reputation": 5, "fame": 3, "social": 1}, "result": "Ev güzel oldu. Misafirler hayran kaldı. Zevkine yatırım yaptın."},
            {"text": "Sadece gerekli tamirleri yap", "effects": {"money": -40}, "result": "Pratik çözüm. Ev sağlam, fazla masraf yok."},
            {"text": "Evi sat, yeni bir yere taşın", "effects": {"money": 100, "reputation": -3, "social": -1}, "result": "Eski evi sattın, yeni bir sayfa açtın. Bazıları şaşırdı ama sen rahatladın."}
        ]
    },
    {
        "id": "event_old_friend",
        "title": "Eski Dost",
        "description": "Gençliğinde ayrıldığın en yakın arkadaşın yıllar sonra kapında. Çok şey yaşanmış, çok şey değişmiş.",
        "icon": "🤗",
        "conditions": {"age_min": 38, "age_max": 60},
        "choices": [
            {"text": "İçeri al, günlerce konuş", "effects": {"social": 3, "health": 5, "charisma": 1}, "result": "Yılların özlemi döküldü. Gençliğinizi yaşadınız sanki. Ruhun tazelendi."},
            {"text": "Kısa görüş, geçmişe takılma", "effects": {"social": 1}, "result": "Sıcak ama kısa bir buluşma. Hayatlar artık farklı."},
            {"text": "Neden gitti diye sor, eski kırgınlığı açıkla", "effects": {"honor": 5, "charisma": 1, "social": 1}, "result": "Ağır ama gerçek bir konuşma. Yıllar önce yaşanan yanlış anlaşılma çözüldü."}
        ]
    },
    {
        "id": "event_past_revealed",
        "title": "Geçmiş Ortaya Çıktı",
        "description": "Gençliğinde yaptığın bir hata — belki bir yanlış karar, bir gizlenen sır — yıllar sonra gün yüzüne çıktı.",
        "icon": "🔍",
        "conditions": {"age_min": 38, "age_max": 60},
        "choices": [
            {"text": "Kabul et ve özür dile", "effects": {"honor": 15, "reputation": -5, "charisma": 2}, "result": "Ağır ama dürüsttü. Bazıları kırgın kaldı, ama saygınlığını kaybetmedin."},
            {"text": "İnkar et, üstüne git", "effects": {"honor": -15, "reputation": -10, "fear": 5}, "result": "İnanmadılar. Artık hem geçmişin hem inkârın sırtında."},
            {"text": "Açıkla, bağlamı anlat", "effects": {"intelligence": 2, "reputation": 3, "charisma": 1}, "result": "Hikâyeni anlattın. Herkes kendi yorumunu yaptı. Çoğunluk anladı."}
        ]
    },
    {
        "id": "event_earthquake",
        "title": "Deprem",
        "description": "Gece yarısı yer sallandı. Evin duvarı çatladı. Komşuların bazısı enkaz altında kaldı.",
        "icon": "🌍",
        "conditions": {"age_min": 35, "age_max": 60},
        "choices": [
            {"text": "Enkaza koş, ellerin kansın", "effects": {"health": -15, "stamina": 1, "honor": 15, "reputation": 12, "fame": 5}, "result": "Dört kişiyi enkaz altından çıkardın. Sabah olduğunda adın her ağızda."},
            {"text": "Aileni topla ve güvenli alana git", "effects": {"honor": 3, "health": 5}, "result": "Aileni korudun. Enkaz kurtarma başkaları yaptı. Her karar saygıya değer."},
            {"text": "Yardım koordinasyonu yap, organize et", "effects": {"intelligence": 2, "reputation": 10, "trade": 1, "charisma": 1}, "result": "Kurtarma ekiplerini organize ettin. Kaos düzene girdi. Liderlik yeteneklerin parladı."}
        ]
    },
    {
        "id": "event_shadow_of_past",
        "title": "Geçmişin Gölgesi",
        "description": "Gençliğinde üye olduğun bir örgüt — ya da taraf olduğun eski bir grup — şimdi kara listeye girdi. Bağlantın ortaya çıkabilir.",
        "icon": "🌑",
        "conditions": {"age_min": 38, "age_max": 60},
        "choices": [
            {"text": "Yetkililere teslim ol, itirafçı ol", "effects": {"honor": 8, "crime": -15, "reputation": -5, "money": -50}, "result": "Zor bir karardı. Ama temiz bir sayfa açıldı. Ceza hafif tutuldu."},
            {"text": "Delilleri imha et, iz bırakma", "effects": {"crime": 5, "honor": -8, "intelligence": 1}, "result": "Şimdilik kurtuldun. Ama bu sır ağır taşınıyor."},
            {"text": "Güvendiğin birine danış", "effects": {"social": 1, "intelligence": 1, "charisma": 1}, "result": "Doğru kişi doğru tavsiye verdi. Hem hukuki hem ahlaki bir çıkış yolu buldun."}
        ]
    },
    {
        "id": "event_heir_problem",
        "title": "Varis Sorunu",
        "description": "Mülkün, işin ve adın kime kalacağı sorusu artık gerçek. Çocukların arasında rekabet başladı.",
        "icon": "👑",
        "conditions": {"age_min": 45, "age_max": 60, "has_children": True},
        "choices": [
            {"text": "En yeteneklisini seç", "effects": {"intelligence": 2, "reputation": 5, "honor": 5}, "result": "Bir çocuk mutlu, diğerleri kırgın. Ama iş doğru ellerde."},
            {"text": "Eşit böl, adil paylaştır", "effects": {"honor": 10, "reputation": 8, "social": 2}, "result": "Herkes bir parça aldı. Anlaşmazlık azaldı. Adalet ön plana çıktı."},
            {"text": "Hepsini bir arada çalıştır, rekabeti körükle", "effects": {"trade": 2, "money": 80, "social": -2}, "result": "Verimlilik arttı ama kardeş gerginliği de. Seçim sana kalmış."}
        ]
    },
    {
        "id": "event_spy_unmasked",
        "title": "Casus Ortaya Çıktı",
        "description": "Yakın çevrenden biri — belki bir çalışanın, belki bir komşun — rakip beylik için casusluk yapıyormuş. Kanıtlar sende.",
        "icon": "🕵️",
        "conditions": {"age_min": 35, "age_max": 60},
        "choices": [
            {"text": "Yetkililere teslim et", "effects": {"reputation": 12, "honor": 8, "fame": 5}, "result": "Adam tutuklandı. Sen güvenilir biri olarak tanındın. Bey sana minnettar."},
            {"text": "Kendin yüzleş, çift ajan yap", "effects": {"intelligence": 3, "crime": 5, "fame": 3}, "result": "Zekice bir hamle. Adam artık senin için çalışıyor. Tehlikeli ama kazançlı."},
            {"text": "Serbest bırak, uyar", "effects": {"honor": 3, "reputation": -3, "social": 1}, "result": "Adam şehri terk etti. Merhamet mi, hata mı, bilemiyorsun."}
        ]
    },
    {
        "id": "event_last_battle_call",
        "title": "Son Savaş Daveti",
        "description": "Bey, bölgenin savunması için deneyimli savaşçıları çağırıyor. Yaşın ilerledi ama adın hâlâ duyuluyor.",
        "icon": "⚔️",
        "conditions": {"age_min": 40, "age_max": 58},
        "choices": [
            {"text": "Katıl, son kez savaş", "effects": {"health": -25, "combat": 2, "fame": 15, "honor": 12, "money": 150}, "result": "Ağır bir savaştı. Yaralandın ama savaş alanından çekilmedin. Şehitler yanında adın yazıldı."},
            {"text": "Genç savaşçılara yol ver, danışman ol", "effects": {"intelligence": 1, "fame": 5, "honor": 8, "reputation": 8}, "result": "Tecrübeni aktardın. Zafer kazanıldı, kısmen senin stratejin sayesinde."},
            {"text": "Yaşım geçti, gidemem", "effects": {"honor": -5, "reputation": -3}, "result": "Anladılar. Ama gitmeyenlerin gözleri yerde kaldı."}
        ]
    },
    {
        "id": "event_legend_offer",
        "title": "Efsane Olma Teklifi",
        "description": "Bir ozanlar topluluğu sana geldi: 'Hayatını destana dönüştürelim. Adın yüzyıllar sonra da yaşasın.'",
        "icon": "📖",
        "conditions": {"age_min": 45, "age_max": 60, "fame_min": 20},
        "choices": [
            {"text": "Kabul et, hikâyeni anlat", "effects": {"fame": 20, "reputation": 10, "money": -30}, "result": "Destan yazıldı. Adın şiirler ve masallarla yaşayacak. Ölümsüzlük bu demek."},
            {"text": "Kabul et ama gerçekleri koru", "effects": {"fame": 12, "honor": 10, "reputation": 5}, "result": "Hem gerçek hem etkileyici bir destan çıktı. En doğru seçimdi."},
            {"text": "Reddet, alçakgönüllülük daha güzel", "effects": {"honor": 15, "reputation": 8}, "result": "Ozanlar şaşırdı. Alçakgönüllülüğün bile destana girdi."}
        ]
    },
    {
        "id": "event_family_reconciliation",
        "title": "Aile Barışı",
        "description": "Yıllardır küs olan aile üyeleri — belki kardeşin, belki uzak bir akraban — bir araya gelme isteği iletti.",
        "icon": "👨‍👩‍👧‍👦",
        "conditions": {"age_min": 38, "age_max": 60},
        "choices": [
            {"text": "Barışa öncülük et, herkesi topla", "effects": {"honor": 15, "reputation": 10, "social": 3, "charisma": 2}, "result": "Uzun küslük sona erdi. Gözyaşları aktı, sarmaşlar oldu. Bu anı hep hatırlayacaksın."},
            {"text": "Git ama beklenti olmadan", "effects": {"honor": 8, "social": 1}, "result": "Temkinli ama samimi bir buluşma. İlk adım atıldı."},
            {"text": "Gitme, yara çok derin", "effects": {"honor": -5, "reputation": -3}, "result": "Küslük sürdü. Belki bir gün, belki hiç."}
        ]
    },
    {
        "id": "event_charity_opportunity",
        "title": "Hayırseverlik Fırsatı",
        "description": "Şehirde okul ya da köprü yaptırmak için bağışçı aranıyor. Adını kalıcı bir esere bırakma fırsatı.",
        "icon": "🕌",
        "conditions": {"age_min": 38, "age_max": 60, "money_min": 80},
        "choices": [
            {"text": "Büyük bağış yap, eser yaptır", "effects": {"money": -200, "fame": 20, "reputation": 15, "honor": 12}, "result": "Yapının taşına adın kazındı. Nesiller geçtikçe adın yaşayacak."},
            {"text": "Orta ölçekli bağış", "effects": {"money": -80, "fame": 8, "reputation": 8, "honor": 5}, "result": "Katkın takdirle karşılandı. Adın hayırseverkatkıcılar listesinde."},
            {"text": "Bağış yerine gönüllü çalış", "effects": {"honor": 10, "reputation": 5, "health": -5, "social": 2}, "result": "Para değil emek verdin. Halk bu samimiyeti takdir etti."}
        ]
    },

    # ══════════════════════════════════════════════════════════
    # 👴 YAŞLILIK (60+) — +11 EVENT  [Adım 5B-3]
    # ══════════════════════════════════════════════════════════

    {
        "id": "event_farewell_thoughts",
        "title": "Hayata Veda Hazırlığı",
        "description": "Geceleri uyku uyuyamazsın. Göçüp gitmiş olanları düşünürsün — annen, baban, belki çocuk yaşta kaybettiğin birileri. Yaşadıklarına mı minnetsin, yoksa pişmanlık mı ağır basıyor?",
        "icon": "🕯️",
        "conditions": {"age_min": 62, "age_max": 999},
        "choices": [
            {"text": "Yaptıklarınla barış, huzurla otur", "effects": {"honor": 15, "health": 8, "reputation": 5}, "result": "Geçmişinle yüzleştin ve affettin. Sabah kalktığında omzundaki yük biraz daha hafifti."},
            {"text": "Pişmanlıklarını birine anlat", "effects": {"honor": 10, "social": 2, "charisma": 1}, "result": "Söylediğin şeyler yıllardır içinde birikmişti. Paylaşmak iyileştirdi."},
            {"text": "Sessiz kal, bu ağırlığı taşımaya alıştın", "effects": {"honor": 3, "health": -5}, "result": "Yalnız kaldın düşüncelerinle. Ağır ama tanıdık bir yük."}
        ]
    },
    {
        "id": "event_testament_writing",
        "title": "Vasiyetname Zamanı",
        "description": "Köyün imamı ya da şehir kâtibi sana geldi: 'Yaşın ilerledi. Geride ne bırakmak istediğini şimdiden belirlesen iyi olur.' Mal mülk, isimler, son dilekler…",
        "icon": "📜",
        "conditions": {"age_min": 63, "age_max": 999},
        "choices": [
            {"text": "Her şeyi adil böl, herkese hakkını ver", "effects": {"honor": 20, "reputation": 12, "fame": 5}, "result": "Vasiyetname yazıldı. Eşitlik içinde. Adın adil biri olarak anılacak."},
            {"text": "En güvendiğin kişiye bırak, o dağıtsın", "effects": {"honor": 12, "reputation": 8, "social": 1}, "result": "Güvenin bir lütuftu. O kişi görevi şerefle taşıyacak."},
            {"text": "Şimdilik erken, biraz daha bekleyelim", "effects": {"honor": -5}, "result": "Kâtip anlayışla gitti. Ama bu mesele ertelendikçe ağırlaşır."}
        ]
    },
    {
        "id": "event_becoming_legend",
        "title": "Efsane Olmak",
        "description": "Uzak köylerdeki çocuklar seni duymuş. Bir anne çocuğuna 'Onun gibi ol' demiş. Pazarlarda senin gençlik hikâyelerin anlatılıyor; ama hiç tanımadıkların tarafından.",
        "icon": "🌟",
        "conditions": {"age_min": 60, "age_max": 999, "fame_min": 15},
        "choices": [
            {"text": "Efsaneyi koru, sessiz kal", "effects": {"fame": 10, "honor": 12, "reputation": 8}, "result": "Gizemli kalmak efsaneyi büyüttü. Adın şimdi daha uzaklara ulaşıyor."},
            {"text": "Halkla buluş, gerçeği anlat", "effects": {"fame": 8, "reputation": 15, "social": 2, "charisma": 2}, "result": "Gerçek hikâyen daha da güzeldi. İnsanlar seni hem sevdi hem saydı."},
            {"text": "Rahatsız edici, geri çekil", "effects": {"honor": 5, "health": 5}, "result": "Huzuru seçtin. Efsane yaşamaya devam etti, ama sen kenara çekildin."}
        ]
    },
    {
        "id": "event_wisdom_transfer",
        "title": "Bilgelik Aktarımı",
        "description": "Genç bir delikanlı — belki torunun, belki komşunun oğlu — kapına geldi: 'Senden öğrenmek istiyorum. Hayatın sırrını söyle.' Ne söylersin?",
        "icon": "🧑‍🏫",
        "conditions": {"age_min": 60, "age_max": 999},
        "choices": [
            {"text": "Her şeyi anlat, saatler sürsün", "effects": {"intelligence": 1, "social": 3, "honor": 15, "fame": 8}, "result": "Ona yaşadıklarını, hatalarını, korkularını anlattın. Gözleri doldu. Bu konuşma ikisini de değiştirdi."},
            {"text": "Tek bir öğüt ver, özlü ve derin", "effects": {"honor": 12, "intelligence": 1, "reputation": 6}, "result": "Bir cümle. Ama o cümle onun hayatında iz bırakacak. Bilgeliğin ölçüsü kelimenin sayısıyla değil ağırlığıyla ölçülür."},
            {"text": "Deneyerek öğrensin, sözle olmaz", "effects": {"honor": 8, "reputation": 5}, "result": "Doğru bir cevap. Kendi yolunu kendisi çizmeli. Onu uğurladın."}
        ]
    },
    {
        "id": "event_final_pilgrimage",
        "title": "Son Yolculuk",
        "description": "Uzak ve kutsal bir yere — dağ başındaki türbe, eski tapınak ya da deniz kıyısındaki dergâh — son kez gitme isteği içini sardı. Bu yolculuk kolay olmayacak ama içinde bir ses 'gitmek zorundayım' diyor.",
        "icon": "🕌",
        "conditions": {"age_min": 61, "age_max": 999},
        "choices": [
            {"text": "Yola çık, ne olursa olsun", "effects": {"honor": 20, "health": -15, "fame": 10, "reputation": 10}, "result": "Yolculuk zordu. Bacakların tutmadı bazen. Ama vardın. Döndüğünde için bambaşka bir huzurla doluydu."},
            {"text": "Birini yanında götür, yalnız gidemezsin", "effects": {"honor": 15, "health": -8, "social": 2}, "result": "Yol arkadaşınla birlikte gittin. Hem güvende hem anlamlıydı. Dönüşünüzde ikisi de değişmişti."},
            {"text": "Gücün yok, burada dua et", "effects": {"honor": 8, "health": 5}, "result": "Kapının önünde oturarak dua ettin. Uzak yerlere vücutla değil, yürekle de ulaşılır."}
        ]
    },
    {
        "id": "event_ancient_treasure",
        "title": "Antik Hazine",
        "description": "Ömür boyu duyduğun bir efsane gerçek çıktı. Eski bir haritada, dedenden kalma bir sandıkta ya da çürük bir duvarın arkasında — aradığın şey orada.",
        "icon": "💎",
        "conditions": {"age_min": 62, "age_max": 999},
        "choices": [
            {"text": "Hazineyi al, hayatın ödülü bu", "effects": {"money": 500, "fame": 15, "honor": 5}, "result": "Ellerin titredi. Yıllar öncesinden beri aradın, sonunda buldun. Bu para değil, bir ömrün cevabıydı."},
            {"text": "Halkla paylaş, tek başına anlamsız", "effects": {"money": 150, "fame": 25, "honor": 20, "reputation": 15}, "result": "Hazineyi topluma bağışladın. Adın bugünden daha büyük bir şeye dönüştü."},
            {"text": "Yerinde bırak, bazı şeyler dokunulmadan durmalı", "effects": {"honor": 15, "intelligence": 1}, "result": "Baktın, gülümseyip kapıyı kapattın. Bilmek yeterliydi. Bulmak bazen bu demektir."}
        ]
    },
    {
        "id": "event_final_peace",
        "title": "Yıllar Sonra Barış",
        "description": "Eski düşmanın — belki bir aile kavgası, belki yıllar önceki bir ihanet — elinde bir mektupla ya da bizzat kapında duruyor. Yüzü yorgun, gözleri af diliyor.",
        "icon": "🤝",
        "conditions": {"age_min": 60, "age_max": 999},
        "choices": [
            {"text": "Affet, bu öfkeyi taşımak yorucu artık", "effects": {"honor": 25, "health": 10, "reputation": 10}, "result": "İkisi de ağladı. Yıllar eridi bir anda. Bu af senin için de bir özgürlüktü."},
            {"text": "Dinle ama kolay affetme, zaman ister", "effects": {"honor": 12, "reputation": 5}, "result": "Kapıyı kapatmadın ama ardına kadar da açmadın. İlk adım atıldı."},
            {"text": "Geç kaldı, yara kapanmaz artık", "effects": {"honor": -5, "health": -5}, "result": "Gitmesine izin verdin. Belki haklıydın. Ama gece yine aynı rüyayı gördün."}
        ]
    },
    {
        "id": "event_life_reckoning",
        "title": "Hayat Muhasebesi",
        "description": "Uzun bir hastalık ya da bir kaza seni yavaşlattı. Günlerce yatakta yatarken tüm kararlarını yeniden yaşadın. Doğru yolda mıydın? Pişmanlıklar mı ağır basıyor, yoksa gurur mu?",
        "icon": "⚖️",
        "conditions": {"age_min": 63, "age_max": 999},
        "choices": [
            {"text": "Hayatından memnunsun, gurur duy", "effects": {"honor": 15, "health": 10, "fame": 5}, "result": "İçin rahatladı. Hepsine değdi. Bu huzur en büyük servetti."},
            {"text": "Pişmanlıklarını kabul et, ama ilerle", "effects": {"honor": 12, "intelligence": 1, "health": 5}, "result": "Hatalar oldu. Ama onları taşımak değil, öğrenmek seçtin. Bu olgunluğun zirvesiydi."},
            {"text": "Her şey anlamsız hissettiriyor", "effects": {"honor": -8, "health": -10, "reputation": -5}, "result": "Karanlık bir dönem. Ama bu his geçer. Geçmişin ve şimdinin değeri hâlâ var."}
        ]
    },
    {
        "id": "event_last_student",
        "title": "Son Öğrenci",
        "description": "Bir genç, mesleğini ya da sanatını devralmak istiyor. Yıllar sonra adın onun işlerinde yaşayacak. Bu hem büyük bir onur hem büyük bir sorumluluk.",
        "icon": "🎓",
        "conditions": {"age_min": 61, "age_max": 999},
        "choices": [
            {"text": "Her şeyini öğret, hiçbir sırrı saklamadan", "effects": {"honor": 20, "fame": 12, "reputation": 10, "social": 2}, "result": "Yıllar süren bilgi birkaç aya sıkıştı. Öğrencin hazırlandı. Mirasın yaşayacak."},
            {"text": "Öğret ama kendi yolunu bulmasına izin ver", "effects": {"honor": 15, "intelligence": 1, "reputation": 8}, "result": "Temel öğrettin, gerisi ona kaldı. En iyi öğretmenler böyle yapar."},
            {"text": "Zamanı yok, bunu yapacak enerjin kalmadı", "effects": {"honor": -5, "reputation": -3}, "result": "Genç hayal kırıklığıyla gitti. Bilginin bir kısmı seninle gidecek."}
        ]
    },
    {
        "id": "event_grandchild_bond",
        "title": "Torunla Bağ Kurma",
        "description": "Torunun ya da en küçük aile ferdi yanında oturdu ve sordu: 'Büyükbaba/büyükanne, sen kimdin gençken?' O masumiyetle bakan gözlere ne anlatırsın?",
        "icon": "👶",
        "conditions": {"age_min": 60, "age_max": 999, "has_children": True},
        "choices": [
            {"text": "Her şeyi anlat — maceralar, hatalar, aşklar", "effects": {"honor": 18, "social": 2, "fame": 6, "health": 5}, "result": "Gözleri büyüdü. Güldü, üzüldü, şaşırdı. Bu anı ömrü boyunca hatırlayacak — ve sen de."},
            {"text": "Sadece güzel anıları paylaş", "effects": {"honor": 12, "health": 8, "reputation": 5}, "result": "Masallara dönüştü hikâyeler. Uyurken yüzü gülümsüyordu. Yeterince güzel."},
            {"text": "Bir gün büyüyünce anlarsın, de", "effects": {"honor": 5}, "result": "Sabırsızca başını salladı. Belki gerçekten büyüyünce anlayacak."}
        ]
    },
    {
        "id": "event_peaceful_death",
        "title": "Huzurlu Geçiş",
        "description": "Vücudun sinyaller veriyor. Doktor, imam ya da yaşlı bir akıllı seni uyarıyor: vaktin yaklaşıyor olabilir. Son günlerini nasıl geçirmek istiyorsun?",
        "icon": "☮️",
        "conditions": {"age_min": 65, "age_max": 999},
        "choices": [
            {"text": "Sevdiklerini topla, hep birlikte ol", "effects": {"honor": 30, "health": 5, "reputation": 15, "fame": 10}, "result": "Etrafın doluydu. Ellerin tutuldu. Son nefese kadar yalnız değildin. Bu en güzel vedaydı."},
            {"text": "Sessizce, yalnız başına son yolculuk", "effects": {"honor": 20, "health": 10}, "result": "Kalabalık istemiyordun. Huzur içinde, kendi ritminle. Bazı yollar yalnız yürünür."},
            {"text": "Henüz hazır değilim, direnirim", "effects": {"health": -10, "honor": 10, "stamina": 1}, "result": "Daha yapacak işlerin var. İrade güçlüydü. Biraz daha zaman kazandın — şimdilik."}
        ]
    },

]


# ─────────────────────────────────────────────────────────────
# KOŞUL KONTROLÜ
# ─────────────────────────────────────────────────────────────

def _player_age(state: dict) -> int:
    """Oyuncunun gerçek yaşını döndürür."""
    player = state["player"]
    if "age" in player:
        return int(player["age"])
    base_age = int(player.get("base_age", 7))
    turns = int(state.get("turn", 0))
    weeks_per_year = 52
    return base_age + turns // weeks_per_year


def check_conditions(conditions: dict, player: dict, state: dict) -> bool:
    age = _player_age(state)
    if age < conditions.get("age_min", 0):
        return False
    if age > conditions.get("age_max", 999):
        return False
    money = float(player.get("money", 0))
    if money < conditions.get("money_min", 0):
        return False
    if "money_max" in conditions and money > conditions["money_max"]:
        return False
    if player.get("crime", 0) < conditions.get("crime_min", 0):
        return False
    if player.get("fame", 0) < conditions.get("fame_min", 0):
        return False
    if player.get("reputation", 0) < conditions.get("reputation_min", -999):
        return False
    if player.get("reputation", 0) > conditions.get("reputation_max", 999):
        return False
    if conditions.get("has_spouse") and not player.get("spouse_id"):
        return False
    if conditions.get("no_spouse") and player.get("spouse_id"):
        return False
    if conditions.get("has_children") and not player.get("children_ids"):
        return False
    if "profession" in conditions and player.get("profession") != conditions["profession"]:
        return False
    if "location_kind" in conditions:
        loc = next(
            (l for l in state.get("world", {}).get("locations", [])
             if l["id"] == player.get("location_id")),
            None
        )
        if loc and loc.get("kind") != conditions["location_kind"]:
            return False
    if "health_max" in conditions and player.get("health", 100) > conditions["health_max"]:
        return False
    stat_req = conditions.get("stat_min", {})
    for stat, val in stat_req.items():
        if player.get("stats", {}).get(stat, 0) < val:
            return False
    return True


# ─────────────────────────────────────────────────────────────
# HAVUZ FİLTRELEME
# ─────────────────────────────────────────────────────────────

def get_eligible_events(state: dict) -> list:
    player = state["player"]
    seen = set(state.get("seen_life_events", []))
    return [
        ev for ev in LIFE_EVENTS
        if ev["id"] not in seen
        and check_conditions(ev.get("conditions", {}), player, state)
    ]


# ─────────────────────────────────────────────────────────────
# TETİKLEYİCİ  (advance_time içinden çağrılır)
# ─────────────────────────────────────────────────────────────

def maybe_trigger_life_event(state: dict):
    """Her hafta %30 ihtimalle bir life event tetikler.
    Seçim, oyuncunun hafta planına göre ağırlıklı yapılır (Parça 5)."""
    if state.get("pending_life_event"):
        return  # Zaten bekleyen event var
    if random.random() > 0.30:
        return
    eligible = get_eligible_events(state)
    if not eligible:
        return
    # S3 Dramaturjik Seçim: yönetmen havuzu tona göre süzer
    # (nefes haftasında gergin event gelmez; kriz yayında öne çıkar)
    try:
        from story_director import director_event_bias
        eligible = director_event_bias(state, eligible) or eligible
    except Exception:
        pass
    # Hafta planına göre ağırlıklı seçim — plan yoksa random.choice fallback
    try:
        from simulation import _hafta_weighted_life_event
        event = _hafta_weighted_life_event(state, eligible)
    except Exception:
        event = random.choice(eligible)
    safe_event = {
        "id": event["id"],
        "title": event["title"],
        "description": event["description"],
        "icon": event["icon"],
        "choices": [{"text": c["text"]} for c in event["choices"]],
    }
    state["pending_life_event"] = safe_event


# ─────────────────────────────────────────────────────────────
# SEÇİM UYGULAMA  (POST /life-event/choose)
# ─────────────────────────────────────────────────────────────

def apply_life_event_choice(state: dict, event_id: str, choice_index: int) -> dict:
    event = next((e for e in LIFE_EVENTS if e["id"] == event_id), None)
    if not event:
        raise ValueError(f"Event bulunamadı: {event_id}")

    choices = event["choices"]
    if choice_index < 0 or choice_index >= len(choices):
        raise ValueError("Geçersiz seçenek indeksi")

    choice = choices[choice_index]
    player = state["player"]
    effects = choice.get("effects", {})

    for key, delta in effects.items():
        if key == "add_item":
            player.setdefault("inventory", {})[delta["item"]] = (
                player["inventory"].get(delta["item"], 0) + delta["qty"]
            )
        elif key == "remove_item":
            inv = player.setdefault("inventory", {})
            inv[delta["item"]] = max(0, inv.get(delta["item"], 0) - delta["qty"])
        elif key == "wanted_in_current":
            if delta and player.get("location_id") not in player.get("wanted_in", []):
                player.setdefault("wanted_in", []).append(player["location_id"])
        elif key in ("strength", "intelligence", "charisma", "stamina"):
            stats = player.setdefault("stats", {})
            stats[key] = max(0, stats.get(key, 0) + int(delta))
        elif key in ("combat", "trade", "crafting", "social"):
            skills = player.setdefault("skills", {})
            skills[key] = max(0, skills.get(key, 0) + int(delta))
        elif key == "money":
            player["money"] = round(max(0.0, float(player.get("money", 0)) + float(delta)), 1)
        elif key == "health":
            player["health"] = min(100, max(0, int(player.get("health", 100)) + int(delta)))
        elif key == "reputation":
            # GDD v8 D1: event itibar ödülleri enflasyon yapıyordu (çocuk
            # 2 yılda tavana dayanıyordu) — pozitif deltalar yarıya iner
            d = (int(delta) + 1) // 2 if delta > 0 else int(delta)
            player["reputation"] = max(-100, min(100, player.get("reputation", 0) + d))
        elif key in player:
            player[key] = round(max(0, player.get(key, 0) + delta), 1)

    # S4 retroaktif: bu seçim bir tohum tarifine denk geliyorsa sessizce ek
    try:
        from story_director import sow_from_life_event
        sow_from_life_event(state, event_id, choice_index)
    except Exception:
        pass

    state.setdefault("seen_life_events", []).append(event_id)
    state.pop("pending_life_event", None)

    state.setdefault("history", []).append({
        "turn": state.get("turn", 0),
        "type": "life_event",
        "event_id": event_id,
        "event_title": event["title"],
        "choice": choice["text"],
        "result": choice["result"],
    })

    return {
        "event_title": event["title"],
        "choice_text": choice["text"],
        "result_text": choice["result"],
        "effects_applied": effects,
    }


# ─── Faz 2C: Yetişkin/orta yaş/yaşlılık havuzu genişletmesi ───────────────
from life_events_v2 import LIFE_EVENTS_V2
LIFE_EVENTS.extend(LIFE_EVENTS_V2)
