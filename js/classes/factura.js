﻿'use strict';
/**
 * @class СчетФактура
 */
class СчетФактура extends кДокумент {
    /**
     * @param {Number} НомерЗаписи Номер записи счет-фактуры в таблице документ
     */
    constructor(НомерЗаписи) {
        super(35, НомерЗаписи);
        this.Прочитать();
        this.НДС = Number(ПрочитатьКонстанту(this.Объект.Дата, "НДС"));
        this.ВариантДетализации = 0;
        this.Режим = Number(ПрочитатьКонстанту(this.Объект.Дата, "РЕЖИМДЕТСЧФ"));
        this.мФактуры = {};
        this.мВсеИндексыФактур = new Set();
        // todo refactor
        this.мФактуры["Было"] = [];
        this.мФактуры["текФактура"] = [];
        this.мФактуры["Результат"] = [];
        this.мФактуры.ЭтоКоррФактура = this.мФактуры.ЕстьДопКорректировки = 0;
        this.Реквизиты = undefined;
    }

    /**
     * Возвращает реквизиты для печати счета-фактуры
     * @returns {{}}
     */
    ПолучитьРеквизитыДляПечати() {
        // не зачем делать одно и тоже несколько раз
        if(this.Реквизиты)
            return this.Реквизиты;
        this.Реквизиты = {};
        let оДоговор = new кДоговор(this.Объект["Документы-Договор"]).Прочитать();
        let оПродавец = this.ЛицоСПапки("Лицо1").Прочитать();
        let оГрузоотправитель = this.ЛицоСПапки("Лицо2").Прочитать();
        let оПокупатель = new кОрганизация(this.Объект.Лицо1).Прочитать();
        let оГрузополучатель = new кОрганизация(this.Объект.Лицо2).Прочитать();
        let РСчетаГрОтправителя = оДоговор.РасчетныйСчетГрузоотправителя();
        this.Реквизиты.Номер = this.ПечатныйНомер();
        this.Реквизиты.Дата = this.Объект.Дата.format("rusDate");
        this.Реквизиты.СтрДата = this.Объект.Дата.МесяцПрописью() + " " + this.Объект.Дата.getFullYear() + "г.";
        this.Реквизиты.Приложение = "Приложение № 1 к Правилам ведения журналов учета полученных и выставленных счетов - фактур, "
            + "книг покупок и книг продаж при расчетах по налогу на добавленную стоимость";
        this.Реквизиты.ВРедакции = "(в ред. Постановлений Правительства РФ от 15.03.2001 № 189, от 27.07.2002 № 575, от 16.02.2004 № 84, от 11.05.2006 № 283, "
            + "от 26.05.2009 №451)";
        this.Реквизиты.НазваниеОтчета = "СЧЕТ-ФАКТУРА № " + this.Реквизиты.Номер + " от " + this.Реквизиты.Дата + "г.";
        // TODO выпилить бы лишнее
        this.Реквизиты.НазваниеОтчета1 = "СЧЕТ № " + this.Реквизиты.Номер + " от " + this.Реквизиты.Дата + "г.";
        this.Реквизиты.ДатаИсправления = !this.Объект.ИсправлениеДата.isEmpty() ? this.Объект.ИсправлениеДата.format("rusDate") : "------";
        this.Реквизиты.НомерИсправления = this.Объект.ИсправлениеНомер ? this.Объект.ИсправлениеНомер : "------";
        // TODO Текст(оДок.Срок, "ДАТА в@");
        this.Реквизиты.Срок = this.Объект.Срок.format("dd MMMMM yyyy г.");
        if (this.мФактуры.ЭтоКоррФактура) {
            let оОснованиеСФ = new кДокумент(35, мДанныеФактуры["БЫЛО"][0].позФактуры);
            оОснованиеСФ.Прочитать();
            this.Реквизиты.НазваниеОтчета = "КОРРЕКТИРОВОЧНЫЙ СЧЕТ-ФАКТУРА № " + this.Реквизиты.Номер + " от " + this.Реквизиты.Дата + "г.";
            this.Реквизиты.Исправление = "ИСПРАВЛЕНИЕ КОРРЕКТИРОВОЧНОГО СЧЕТА-ФАКТУРЫ № " + (оОснованиеСФ.Объект.ИсправлениеНомер ? оОснованиеСФ.Объект.ИсправлениеНомер : "______")
                + " от " + (!оОснованиеСФ.Объект.ИсправлениеДата.isEmpty() ? оОснованиеСФ.Объект.ИсправлениеДата.format("rusDate") : "______") + "г.";
            this.Реквизиты.КФактуре = "к СЧЕТУ-ФАКТУРЕ № " + оОснованиеСФ.ПечатныйНомер() + " от " + оОснованиеСФ.Объект.Дата.format("rusDate")
                + "г., с учетом исправления №" + (оОснованиеСФ.Объект.ИсправлениеНомер != 0 ? оОснованиеСФ.Объект.ИсправлениеНомер : "------")
                + " от " + (!оОснованиеСФ.Объект.ИсправлениеДата.isEmpty() ? оОснованиеСФ.Объект.ИсправлениеДата : "------") + "г.";
            this.Реквизиты.КНомер = оОснованиеСФ.ПечатныйНомер();
            this.Реквизиты.КДата = оОснованиеСФ.Объект.Дата.format("rusDate");
            this.Реквизиты.КНомерИсправления = оОснованиеСФ.Объект.ИсправлениеНомер ? оОснованиеСФ.Объект.ИсправлениеНомер : "------";
            this.Реквизиты.КДатаИсправления = !оОснованиеСФ.Объект.ИсправлениеДата.isEmpty() ? оБыло.ИсправлениеДата : "------";
        }
        this.Реквизиты.Грузоотправитель_ИД = оГрузоотправитель.НомерЗаписи;
        this.Реквизиты.Грузоотправитель = оГрузоотправитель.Объект.Наименование + " " + оГрузоотправитель.Объект.Адрес;
        this.Реквизиты.ГрузоотправительП = оГрузоотправитель.Объект.Наименование + " ИНН/КПП " + оГрузоотправитель.Объект.ИНН
            + "/" + оГрузоотправитель.Объект.КПП + " " + оГрузоотправитель.Объект.Адрес + " "
            + оГрузоотправитель.Объект.Телефон + " р/с " + РСчетаГрОтправителя.РСчет + " в " + РСчетаГрОтправителя.Банк
            + ",БИК " + РСчетаГрОтправителя.БИК + ",корр.с " + РСчетаГрОтправителя.КоррСчет;
        this.Реквизиты.ГрузоотправительНаим = оГрузоотправитель.Объект.Наименование;
        this.Реквизиты.ГрузоотправительАдр = оГрузоотправитель.Объект.Адрес;
        this.Реквизиты.ГрузоотправительИННКПП = оГрузоотправитель.Объект.ИНН + "/" + оГрузоотправитель.Объект.КПП;
        this.Реквизиты.ГрузоотправительИНН = оГрузоотправитель.Объект.ИНН;
        this.Реквизиты.ГрузоотправительКПП = оГрузоотправитель.Объект.КПП;
        this.Реквизиты.ГрузоотправительТел = оГрузоотправитель.Объект.Телефон;
        this.Реквизиты.ГрузоотправительРС = РСчетаГрОтправителя.РСчет;
        this.Реквизиты.ГрузоотправительБанк = РСчетаГрОтправителя.Банк;
        this.Реквизиты.ГрузоотправительБик = РСчетаГрОтправителя.БИК;
        this.Реквизиты.ГрузоотправительКорРС = РСчетаГрОтправителя.КоррСчет;

        this.Реквизиты.Грузополучатель_ИД = оГрузополучатель.НомерЗаписи;
        this.Реквизиты.Грузополучатель = оГрузополучатель.Объект.Наименование + ", "
            + (оГрузополучатель.Объект.ФактАдрес != "" ? оГрузополучатель.Объект.ФактАдрес : оГрузополучатель.Объект.Адрес );
        this.Реквизиты.ГрузополучательП = оГрузополучатель.Объект.Наименование + " ИНН/КПП " + оГрузополучатель.Объект.ИНН + "/"
            + оГрузополучатель.Объект.КПП + " " + оГрузополучатель.Объект.Адрес + " "
            + оГрузополучатель.Объект.Телефон + " р/с " + оГрузополучатель.Объект.р_счет + " в " + оГрузополучатель.Объект.банк
            + ",БИК " + оГрузополучатель.Объект.бик + ",корр.с " + оГрузополучатель.Объект.коррсчет;
        this.Реквизиты.ГрузополучательНаим = оГрузополучатель.Объект.Наименование;
        this.Реквизиты.ГрузополучательАдр = оГрузополучатель.Объект.Адрес;
        this.Реквизиты.ГрузополучательИННКПП = оГрузополучатель.Объект.ИНН + "/" + оГрузополучатель.Объект.КПП;
        this.Реквизиты.ГрузополучательИНН = оГрузополучатель.Объект.ИНН;
        this.Реквизиты.ГрузополучательКПП = оГрузополучатель.Объект.КПП;
        this.Реквизиты.ГрузополучательТел = оГрузополучатель.Объект.Телефон;
        this.Реквизиты.ГрузополучательРС = оГрузополучатель.Объект.р_счет;
        this.Реквизиты.ГрузополучательБанк = оГрузополучатель.Объект.банк;
        this.Реквизиты.ГрузополучательБик = оГрузополучатель.Объект.бик;
        this.Реквизиты.ГрузополучательКорРС = оГрузополучатель.Объект.коррсчет;
        this.Реквизиты.Продавец_ИД = оПродавец.НомерЗаписи;
        this.Реквизиты.ПродавецП = оПродавец.Объект.Наименование + " ИНН/КПП " + оПродавец.Объект.ИНН + "/" + оПродавец.Объект.КПП + " "
            + оПродавец.Объект.Адрес + " " + оПродавец.Объект.Телефон + " р/с " + оПродавец.Объект.р_счет + " в " + оПродавец.Объект.банк
            + ",БИК " + оПродавец.Объект.бик + ",корр.с " + оПродавец.Объект.коррсчет;
        this.Реквизиты.Продавец = оПродавец.Объект.Наименование;
        this.Реквизиты.Адрес = оПродавец.Объект.Адрес;
        this.Реквизиты.ИННКПП = оПродавец.Объект.ИНН + "/" + оПродавец.Объект.КПП;
        this.Реквизиты.ИНН = оПродавец.Объект.ИНН;
        this.Реквизиты.КПП = оПродавец.Объект.КПП;
        this.Реквизиты.ПродавецТел = оПродавец.Объект.Телефон;


        this.Реквизиты.ПродавецРС = оПродавец.Объект.р_счет;
        this.Реквизиты.ПродавецБанк = оПродавец.Объект.банк;
        this.Реквизиты.ПродавецБик = оПродавец.Объект.бик;
        this.Реквизиты.ПродавецКорРС = оПродавец.Объект.коррсчет;


        this.Реквизиты.ПокупательП = оПокупатель.Объект.Наименование + " ИНН/КПП " + оПокупатель.Объект.ИНН + "/" + оПокупатель.Объект.КПП + " "
            + оПокупатель.Объект.Адрес + " " + оПокупатель.Объект.Телефон + " р/с " + оПокупатель.Объект.р_счет + " в " + оПокупатель.Объект.банк
            + ",БИК " + оПокупатель.Объект.бик + ",корр.с " + оПокупатель.Объект.коррсчет;

        this.Реквизиты.Покупатель_ИД = оПокупатель.НомерЗаписи;
        this.Реквизиты.Покупатель = оПокупатель.Объект.Наименование;
        this.Реквизиты.АдресПок = оПокупатель.Объект.Адрес;
        this.Реквизиты.ИННКПППок = оПокупатель.Объект.ИНН + "/" + оПокупатель.Объект.КПП;
        this.Реквизиты.ПокупательТел = оПокупатель.Объект.Телефон;

        this.Реквизиты.ПокупательРС = оПокупатель.Объект.р_счет;
        this.Реквизиты.ПокупательБанк = оПокупатель.Объект.банк;
        this.Реквизиты.ПокупательБик = оПокупатель.Объект.бик;
        this.Реквизиты.ПокупательКорРС = оПокупатель.Объект.коррсчет;
        //Данные.Валюта  = ОКВ("RUR","Н")+", "+ОКВ("RUR","К");

        this.Реквизиты.НомерДок = this.Реквизиты.НомерДог = оДоговор.Объект.Номер;
        this.Реквизиты.ТемаДог = оДоговор.Объект.Тема;
        this.Реквизиты.ДатаДок = оДоговор.Объект["Начало договора"].format("rusDate");
        this.Реквизиты.ДатаДог = оДоговор.Объект["Дата подписания"].format("rusDate");
        this.Реквизиты.ПоДокументам = "Договор";
        this.Реквизиты.СтавкаНДС = this.НДС;


        let з_рук = Query(`SELECT top 1 ФИО, Должность FROM ~Частные лица~ where [Организация-Частные лица] = :1 and [Признаки] = 1`, 100, "org,N");
        з_рук.УстановитьПараметры(оПродавец.НомерЗаписи);
        this.Реквизиты.ПродавецФИО = з_рук.Следующий() ? СчетФактура.ИОФ(з_рук.ФИО): "";

        з_рук.УстановитьПараметры(оГрузоотправитель.НомерЗаписи);
        this.Реквизиты.ГрузоотправительФИОРук = з_рук.Следующий() ? СчетФактура.ИОФ(з_рук.ФИО) : "";

        з_рук.УстановитьПараметры(оГрузополучатель.НомерЗаписи);
        if (з_рук.Следующий()) {
            this.Реквизиты.ГрузополучательДолжностьРук = з_рук.Должность;
            this.Реквизиты.ГрузополучательФИОРук       = СчетФактура.ИОФ(з_рук.ФИО);
        }

        // блок формирования строки "К платежно-расчетному документу" без связи фактур и платежей. Берется кредитовое сальдо и все платежи
        //перем оПлат = Объект("Документ");
        //Данные.ПоПлатежкам  = СФ_РасшифровкаПоПлатежам( оДок.Дата, позицияДоговора, поздок);
        //Данные.ПоДокументам = СФ_РасшифровкаПоДокументам('оДоговор.Бюджет-Договоры');
        //Данные.ВидДоговора  = НаименованиеВидаДоговора( позицияДоговора, оДок.Дата );
        //Данные.Основание    = СФ_ОснованиеДокумента(Данные);
        return this.Реквизиты;
    }

    ПолучитьДанныеФактуры() {
        let з_корФакт = Query(`Select doc.row_id,doc.Дата
                            from ~Связи документов~ sd
                            join ~Документ~ doc on doc.[row_id] = sd.[Связка2] and doc.Дата < :1
                            where sd.[Связка1] =:2 and sd.[Флаги]=128
                            order by doc.Дата desc`, 100, "p1,D,p2,S");
        let зОснФактура = Query(`select top 1 Связка1 from ~Связи документов~ where [Связка2]=:1 and [Флаги]=128`, 100, "p1,S");
        // получим основную фактуру (основание), если это фактура является корректировкой
        зОснФактура.УстановитьПараметры(this.НомерЗаписи);
        if (зОснФактура.Следующий()) {
            // Соберем данные по "основной"
            this.мФактуры.ЭтоКоррФактура = 1;
            let инд = this.мФактуры["Было"].push(this._ПолучитьНаименования()) - 1;
            this.мФактуры["Было"][инд].позФактуры = зОснФактура.Связка1;

            // и переберем все корректировки основной фактуры, если они были ранее
            з_корФакт.УстановитьПараметры(оТекФактура.Дата, зОснФактура.Связка1);
            while (з_корФакт.Следующий()) {
                this.мФактуры.ЕстьДопКорректировки = 1;
                инд = this.мФактуры["Было"].push(this._ПолучитьНаименования(з_корФакт.row_id)) - 1;
                this.мФактуры["Было"][инд].позФактуры = з_корФакт.row_id;
            }
        }

        // возьмём данные нашей текущей фактуры
        this.мФактуры["текФактура"] = this._ПолучитьНаименования(this.НомерЗаписи);
        this.мФактуры["текФактура"].позФактуры = this.НомерЗаписи;
        this.мФактуры["позДоговора"] = this.Объект["Документы-Договор"];

        // подготовим результат для печати было-стало
        this.мФактуры["Результат"] = this._ПолучитьРезультат(this.мФактуры);
        return this.мФактуры;

    }

    // todo Тут ей не место. Нужна переделка, перенести в правильное место или возможно сделать прототипом...
    static ИОФ(СтрокаФИО) {
        let мСодержание = СтрокаФИО.split(/\s+/);
        return (мСодержание[1] ? мСодержание[1].substring(0,1) + "." : "")
            + (мСодержание[2] ? мСодержание[2].substring(0,1) + "." : "")
            + " "+ мСодержание[0];
    }

    _ПолучитьНаименования(НомерЗаписиСФ, ЗаполнятьПоляДо) {
        const Страна = "-";
        const Декл = "-";
        const Акциз = "Без акциза";
        let мНаим = {};
        let зНаим = Query(`SELECT sn.[ЗаМесяц], nom.[НомНомер], sn.[Кол_во], sn.[Сумма], sn.[Сумма2], sn.[Тариф]
                                      , nom.[Наименование], nom.[ЕдИзмерения], nom.[Вариант НДС]
                                      , sn.[Группировка], nom.[row_id] as позНом, sn.[Аналитика1],sn.[Аналитика2], sn.ЛицевыхСумма
                                      , isnull(nom.[Счетчика разрядность],0) as ВключатьВОбъем, sn.row_id as позНСЧ, sn.Комментарий
                                      , isnull(nom.[Счетчика дробная разрядность],0) as СостТарифа
                                   FROM   ~Наименования счета~ sn
                                   left join ~Номенклатура~ nom on nom.ROW_ID=sn.[Склад-Наименования счета]
                                   WHERE sn.[Счет-Наименования]=:1
                                   ORDER  BY sn.[Группировка], sn.[ЗаМесяц], [N п/п], nom.НомНомер, nom.[ЕдИзмерения]`, 100, "DOC,S");
        зНаим.УстановитьПараметры(НомерЗаписиСФ);
        while (зНаим.Следующий()) {
            let Наим = зНаим.toJSObject();
            let инд = this._ИндексГруппировки(Наим);
            let Ставка = this.СтавкаНДС(Наим["Вариант НДС"]);
            this.мВсеИндексыФактур.add(инд);
            if (!мНаим[инд]) мНаим[инд] = {
                Сумма: 0,
                Сумма2: 0,
                ДоСумма: 0,
                ДоСумма2: 0,
                НДС: 0,
                ДоНДС: 0,
                ЛицевыхСумма: 0,
                Тариф: 0,
                ДоТариф: 0,
                Количество: 0,
                ДоКоличество: 0
            };
            let пКалькуляция = Наим.СостТарифа;
            мНаим[инд]["row_id"] = Наим.позНом; // row_id номенклатуры
            мНаим[инд]["позНСЧ"] = Наим.позНСЧ; // row_id наименования счета
            мНаим[инд]["Наименование"] = Наим.Наименование;
            мНаим[инд]["Аналитика1"] = Наим.Аналитика1;
            мНаим[инд]["Аналитика2"] = Наим.Аналитика2;
            мНаим[инд]["ЕдИзмерения"] = Наим.ЕдИзмерения;
            мНаим[инд]["КодЕдИзмерения"] = кНоменклатура.ОКЕИ(Наим.ЕдИзмерения);
            мНаим[инд]["Страна"] = Страна;
            мНаим[инд]["КодСтрана"] = СчетФактура.ОКСМ(Страна);
            мНаим[инд]["Акциз"] = Акциз;
            мНаим[инд]["Декларация"] = Декл;
            мНаим[инд]["Группировка"] = Наим.Группировка;
            мНаим[инд]["ЛицевыхСумма"] += Наим.ЛицевыхСумма;
            мНаим[инд]["Месяц"] = Наим.ЗаМесяц;
            мНаим[инд]["МесяцГрупп"] = "За " + Наим.ЗаМесяц.МесяцПрописью() + " " + Наим.ЗаМесяц.getFullYear();
            мНаим[инд]["ЗаМесяц"] = Наим.ЗаМесяц.withoutTime();
            мНаим[инд]["Комментарий"] = Наим.Комментарий;
            if (!ЗаполнятьПоляДо) {
                мНаим[инд]["Сумма2"] += Наим.Сумма;
                мНаим[инд]["Сумма"] += Наим.Сумма2;

                мНаим[инд]["НДС"] += Наим.Сумма - Наим.Сумма2;
                мНаим[инд]["Ставка"] = Ставка;
                // Если это составляющая то тариф складываем, объем нет
                // иначе складываем объем, а тариф оставляем
                if (пКалькуляция) {
                    мНаим[инд]["Тариф"] += Наим.Тариф;
                    мНаим[инд]["Количество"] = Наим.Кол_во * this._ВключатьВОбъем(Наим);
                }
                else {
                    // TODO понять что там в prg
                    мНаим[инд]["Тариф"] = Наим.Тариф;
                    мНаим[инд]["Количество"] += Наим.Кол_во * this._ВключатьВОбъем(Наим);
                }
            }
            else {
                мНаим[инд]["ДоСтавка"] = Ставка;
                мНаим[инд]["ДоСумма"] += Наим.Сумма2;
                мНаим[инд]["ДоНДС"] += Наим.Сумма - Наим.Сумма2;
                мНаим[инд]["ДоСумма2"] += Наим.Сумма;

                if (пКалькуляция) {
                    мНаим[инд]["ДоТариф"] += Наим.Тариф;
                    мНаим[инд]["ДоКоличество"] = Наим.Кол_во * this._ВключатьВОбъем(Наим);
                }
                else {
                    мНаим[инд]["ДоТариф"] = Наим.Тариф;
                    мНаим[инд]["ДоКоличество"] += Наим.Кол_во * this._ВключатьВОбъем(Наим);
                }
            }
        }
        return мНаим;
    }

    static ОКСМ(страна) {
        switch (страна.toUpperCase()) {
            case "РОССИЯ":
            case "РФ" :
                return "643";
            default:
                return "-";
        }

    }

    //noinspection JSMethodCanBeStatic
    _ВключатьВОбъем(Наим) {
        return  Наим.ВключатьВОбъем;
    }

    _ПолучитьРезультат(мФактуры) {
        let мРезультат = [];
        let индРезультат = 0;
        let мПоля = new Set(["ЛицевыхСумма", "Сумма", "Сумма2", "ДоСумма", "ДоСумма2", "НДС", "ДоНДС", "Количество", "ДоКоличество"]);

        // переберем все наименования всех фактур
        for (let НаимВсехСФ of this.мВсеИндексыФактур) {
            // поищем такое наименование в текущей СФ
            if (мФактуры["текФактура"][НаимВсехСФ]) {
                мРезультат[индРезультат] = {};
                this._СложениеДанных(мРезультат[индРезультат], мФактуры["текФактура"][НаимВсехСФ], мПоля);
            }

            // поищем такое наименование в СФ - основаниях
            for (let ОснСФ of мФактуры["Было"]) {
                if (ОснСФ[НаимВсехСФ]) {
                    this._СложениеДанных(мРезультат[индРезультат], ОснСФ[НаимВсехСФ], мПоля);
                }
            }
            индРезультат++;
        }
        // сложим в "стало" то что было
        for (let Наим of мРезультат) {
            // Если есть данные по старым данным
            if (Наим["ДоКоличество"]) {
                Наим["Количество"] += Наим["ДоКоличество"];
                Наим["Сумма"] += Наим["ДоСумма"];
                Наим["Сумма2"] += Наим["ДоСумма2"];
                Наим["НДС"] += Наим["ДоНДС"];

                // не знаем новый тариф, берем старый

                if (!Наим["Тариф"])
                    Наим["Тариф"] = Наим["ДоТариф"];
                // не знаем ставку, берем старую
                if (!Наим["Ставка"])
                    Наим["Ставка"] = Наим["ДоСтавка"];
            }

            // Если перерасчет и мы насчитали того что небыло ранее
            if (!Наим["ДоСумма"]) {
                Наим["ДоКоличество"] += 0;
                Наим["ДоСумма"] += 0;
                Наим["ДоСумма2"] += 0;
                Наим["ДоНДС"] += 0;
                Наим["ДоТариф"] += 0;
                Наим["ДоСтавка"] = 0;
            }
        }
        return мРезультат;
    }

    // TODO Нужно будет запилить что то подобное общее, т.к. требуется часто...
    //noinspection JSMethodCanBeStatic
    _СложениеДанных(Куда, Откуда, ЧтоСкладывать) {
        for (let Поле in Откуда) {
            if (Откуда.hasOwnProperty(Поле)) {
                if (!Куда[Поле])
                    Куда[Поле] = 0;
                if (ЧтоСкладывать.has(Поле)) {
                    Куда[Поле] += Number(Откуда[Поле]);
                }
                else {
                    Куда[Поле] = Откуда[Поле];
                }

            }
        }
    }

    _ИндексГруппировки(Наим, ЭтоКоррФактура) {
        let пИндекс = Наим.ЗаМесяц.withoutTime();
        let пКалькуляция = Наим.СостТарифа;
        if (this.Режим > 0) {
            let мАн2 = Наим.Аналитика2.split("||");
            // TODO Убрать эту гадость...
            пИндекс += мАн2[1].ЧислоСВедущимиНулями() + +"_" + Наим.Тариф + "_" + Наим.Наименование;
        }
        switch (this.ВариантДетализации) {
            // Месяц,номенклатура, аналитика1,аналитика2
            case 0:
                // нет смысла группировать по номенклатуре, когда это составляющая тарифа
                пИндекс += "_" + (!пКалькуляция ? Наим.НомНомер + "_" + Наим.позНом : "");
                пИндекс += "_" + Наим.Аналитика1 + "_" + Наим.Аналитика2;
                break;
            // Месяц, Аналитика1
            case 1:
                // Месяц,аналитика1,аналитика2
                пИндекс += "_" + Наим.Аналитика1;
                break;
            case 2:
                пИндекс += "_" + Наим.Аналитика1 + "_" + Наим.Аналитика2;
                break;
            default:
                Сообщить("Не определен вариант СФ");
        }
        // Если запись является составляющей тарифа, то группируем еще и по кол-ву,
        // т.к. составляющие не могут быть с разным объемом
        if (пКалькуляция) {
            пИндекс += "_" + Наим.Кол_во
        }
        else {
            // Если это не калькуляция и это не коррфактура,
            // группируем позиции по разным тарифам
            if (!ЭтоКоррФактура)
                пИндекс += "_" + Наим.Тариф;
        }
        return пИндекс;
    }

    СтавкаНДС(Вариант) {
        switch (this.Объект["Вариант НДС"]) {
            case 0:
                return this.НДС.toString();
            case 1:
                return this.НДС.toString() + "/" + String(100 + НДС);
            case 2:
                return "Без НДС";
        }
    }

}
