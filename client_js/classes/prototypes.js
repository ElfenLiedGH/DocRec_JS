"use strict";
/**
 * Set the shoe's color. Use {@link Shoe#setSize} to set the shoe size.
 */
кОрганизация.prototype.ДобавитьОсновнойТелефонОрганизации = function( email, Телефон ) {
    var зДобавитьОсновно = Command(`insert into ~Частные лица~
                                                ([Организация-Частные лица], [Телефон], [email], [ФИО],
                                                   [Частные лица],   [Частные лица_ADD], [Признаки])
                                                values( :1, :2, :3, 'Основной телефон организации', -1, 1, 0 )`, 1, "org,S,tel,A,em,A");
    зВстОснТел.Выполнить(this.НомерЗаписи, Телефон, email);
    зВстОснТел.Завершить();
}
кОрганизация.prototype.ОбновитьОсновнойТелефонОрганизации = function( email, Телефон ) {
    var зОсновнойТелефон = Query("select row_id, Телефон, email\
                                        from ~Частные лица~\
                                        where [ФИО] = 'Основной телефон организации'\
                                        and [Организация-Частные лица] = :1", 1, "org,S");
    зОсновнойТелефон.УстановитьПараметры(this.НомерЗаписи);
    if ( зОсновнойТелефон.Следующий() ) {
        if ( email != зОсновнойТелефон.email || Телефон != зОсновнойТелефон.Телефон ) {
            var зОбновитьОсновнойТелефон = Command("update ~Частные лица~\
                                                   set Телефон = :1, email = :2\
                                                   where row_id = :3", 1, "tel,A,em,A,chl,S");
            зОбновитьОсновнойТелефон.Выполнить(Телефон, email, зОсновнойТелефон.row_id);
            зОбновитьОсновнойТелефон.Завершить();
        }
    } else this.ДобавитьОсновнойТелефонОрганизации(email, Телефон);
}

кЭлСообщение.prototype.УстановитьОрганизацию = function( email, тихийРежим ){
    if( !email.trimLeft() ) {
        if( !тихийРежим ) ВсплывающееОкно( "Не указан адрес отправителя" );
        return -1;
    }
    // полный адрес отправителя (возможно вместе с именем отправителя)
    // выделим электронный адрес отправителя
    var email1 = email.match(/<[A-Za-z0-9_@\.]>/);
    if( email1 ) email = email1.substring( 1, email1.length-1 );

    var зОрганизации = BufferedReader( "SELECT row_id as Орг, Название, '' as ФИО, email, Цвет " +
        "FROM ~Организации~ " +
        "WHERE email LIKE '%" + email + "%' " +
        "UNION ALL " +
        "SELECT [Организация-Частные лица] as Орг, Название, ФИО, face.email, org.Цвет " +
        "FROM ~Частные лица~ face JOIN ~Организации~ org on face.[Организация-Частные лица]=org.ROW_ID " +
        "WHERE ФИО <> 'Основной телефон организации' AND face.email LIKE '%` + email + `%' and face.[Организация-Частные лица] NOT IN(" +
        "SELECT ROW_ID FROM ~Организации~  WHERE email LIKE '%" + email + "%')", 100 );
    зОрганизации.УстановитьПараметры();
    if( тихийРежим ){
        if( зОрганизации.Количество() == 1 & зОрганизации.Следующий() ) {
            if( зОрганизации.Цвет % 8 != 5 ) { // привязываем письмо только к активной организации
                return зОрганизации.Орг;
            }
        }
    } else {
        if( зОрганизации.Количество() == 0 ) {
            ВсплывающееОкно( "Не могу установить список организаций для сообщения" );
        } else if( зОрганизации.Количество() == 1 ){
            зОрганизации.Следующий();
            if( зОрганизации.Цвет % 8 == 5 ) {
                if( ДаНет( "Адрес контакта " + email + " принадлежит организации " + зОрганизации.Название + ", которая не является нашим клиентом.\r\nВсе равно привязать?" ) )
                    return зОрганизации.Орг;
            } else {
                return зОрганизации.Орг;
            }
        } else {
        var актОрганизации = 0;
        var длг = СоздатьДиалог( "ЭлектронноеСообщение Организация" );
        var вОрганизация = new БазоваяВыборка( "ЭлСообщение Организация" );
        вОрганизация.ПолучитьВыборку();
        while( зОрганизации.Следующий() ){
            if( зОрганизации.Цвет % 8 != 5 ) { // смотрим активные организации - которые не серые
                актОрганизации++;
                вОрганизация.Внести( зОрганизации );
            }
        }
        if( актОрганизации == 1 ) { // if активная одна, то ее и ставим
            return вОрганизация.Орг;
        } else {
            длг.Обработчик.Диалог = "ЭлектронноеСообщение";
            if( длг.Выполнить() ) return длг.Обработчик.Организация;
            }
        }
    }
    return -1;
}

/**
 * взвращает дату завершения заявки исходя из ее договора
 * если договор указан, то читает параметр 'СРОК_ИСП' с договора + выходные
 * для пакетных и факт договоров давать на задание 10 дня (выходные не считаются)
 * для "СКА","СЭА","СУА" давать на задание 3 дня
 * для всех остальных 1 день от даты создания
 * @returns {Date}
 */
кЗаявка.prototype.ЗавершитьДо = function( темаДоговора ) {
    var завершитьДо = this.Объект['Дата создания'];
    if( this.Договор.НомерЗаписи != -1 ) {
        var зСрокИсполнения = Query( 'SELECT TOP 1 prop.Значение ' +
            'FROM ~Свойства~ prop JOIN ~Виды параметров~ p on prop.[Виды-Параметры]=p.ROW_ID ' +
            "WHERE p.Название LIKE 'срок_исп' AND prop.[Параметры-Договор]=:1 " +
            'ORDER BY prop.ДатНач DESC', 1, "cont,S" );

        зСрокИсполнения.УстановитьПараметры( this.Договор.НомерЗаписи );
        if( зСрокИсполнения.Следующий() ) // указан срок выпонения - берем его
            завершитьДо = new кРабочийКалендарь().ПрибавитьРабочиеДни( завершитьДо, Number(зСрокИсполнения.Значение) );
    }
    // попробуем по теме договора опредилить дату завершения
    if( завершитьДо.equals( this.Объект['Дата создания'] ) && темаДоговора ) {
        var мДог = ["СКФ", "СЭД", "СКД", "СКП", "СПП", "СК", "СО", "СКА", "СЭА", "СУА"];
        for( let темад of мДог ) { // защита от договора типа "10000СКА ООО ВЭСКП БУ"
            var позТема = темаДоговора.indexOf( темад );
            if( позТема >= 0 && позТема < 8 ) {
                темаДоговора = темад;
                break;
            }
        }
        switch( темаДоговора ) {
            case "СКП":
            case "СКФ":
            case "СКД":
            case "СЭД":
                завершитьДо.setDate( завершитьДо.getDate() + 14 );
                break;
            case "СКА":
            case "СЭА":
            case "СУА":
                завершитьДо.setDate( завершитьДо.getDate() + 3 );
                switch( завершитьДо.ДеньНедели() ) {
                    case "Суббота":
                    case "Воскресенье":
                    case "Понедельник" :
                        завершитьДо.setDate( завершитьДо.getDate() + 2 );
                        break;
                }
                break;
        }
    }
    return завершитьДо;
}

кРабота.prototype.ОтправитьОтвет = function( добавитьКоммент ) {
    if( !this.Заявка || this.Заявка.НомерЗаписи < 0 ) return "Не указана заявка"; // такого не должно быть

    var кому = this.Заявка.Объект['ЭлПочта'];
    var организация = this.Заявка.Объект['Карточка-Организация'];
    if( !кому ) { // не было адреса для ответа - возьмем с организации
        if( this.ЭтоДо ) {
            if( this.Заявка.Объект['Карточка-Организация'] != this.Заявка.Объект['Карточка-ПлОрганизация'] ){
                var мДейств = [ "Заказчик: " + this.Заявка.Объект['Карточка-Организация>Название'],
                    "Плательщик: " + this.Заявка.Объект['Карточка-ПлОрганизация>Название']];
                var мПоз = [1, 2];
                var выборАдресата = ВыборВарианта( "Кому отправляем письмо?", мДейств, мПоз );
                switch( выборАдресата ){
                    case 1:
                        кому = this.Заявка.Объект['Карточка-Организация>email'];
                        break;
                    case 2:
                        кому = this.Заявка.Объект['Карточка-ПлОрганизация>email'];
                        организация = this.Заявка.Объект['Карточка-ПлОрганизация'];
                        break;
                    default :
                        return "Не выбран отправитель";
                }
            } else {
                кому = this.Заявка.Объект['Карточка-Организация>email'];
            }
        } else {
            if( this.Заявка.Объект['КлиентТип'] == "Частное лицо" ) {
                кому = this.Заявка.Объект['Заявка-Частное лицо>email'];
                организация = -1;
            } else {
                кому = this.Заявка.Объект['Карточка-Организация>email'];
            }
        }
    }
    var мАдрес = кому.match( /<[A-Za-z0-9_@\.\-]+>/i );
    if( мАдрес ) кому = мАдрес[0];
    if( !кому ) return "На заявке не указана электронная почта для ответа";

    var сообщение = new кЭлСообщение(); // сообщение для отправки уведомления
    // смотрим ящик для отправки писем на маршруте
    var ящик = this.Заявка.Объект['Карточки-Маршрут>Маршрут-Ящик'];
    ящик = сообщение.ПрочитатьЯщик( ящик > 0 ? ящик : "Отправка уведомлений" );
    if( ящик == -1 ) throw new StackError( "Не указан почтовый ящик для отправки ответа по заявке" );

    var копия = new кОрганизация( организация ).ЭлектронныйАдресОбязательнойКопии();
    var номер = this.Заявка.Объект['Номер'] + (this.Заявка.Объект['СтороннийНомер'] ? " / " + this.Заявка.Объект['СтороннийНомер'] : "" );
    var тема = "Стек: по заявке № " + номер +
        " от " + this.Заявка.Объект['Дата создания'].format('rusDate');
        // для мортона особые условия!
    if( кому.indexOf("@morton") != -1 ) тема = "##" + this.Заявка.Объект['СтороннийНомер'] + "##";
    var текст = '';
    if( !сообщение.Ящик.ЭтоHtml() ) {
        текст = 'По Вашей заявке № ' + номер +
            " от " + this.Заявка.Объект['Дата создания'].format('rusDate') + "\n" +
            this.Заявка.Объект['Примечание'] +
            ( this.Объект.Примечание && добавитьКоммент ? "\n\nСообщаю следующее:\n" + this.Объект.Примечание : "" );
    } else {
        текст = '<div><strong>По Вашей заявке № ' + номер +
            " от " + this.Заявка.Объект['Дата создания'].format('rusDate') + "</strong></div><div><i>" +
            this.Заявка.Объект['Примечание'] + "</i></div>" +
            ( this.Объект.Примечание && добавитьКоммент ? "<br><div><strong>Сообщаю следующее:</strong></div><div>" + this.Объект.Примечание : "" ) + "</div>";
    }
    сообщение.ПрочитатьИзКонтекста( {
        'Кому': кому,
        'Копия' : копия,
        'Тема': тема,
        'Папка' : сообщение.Ящик.НомерЗаписи,
        'Приоритет': 0,
        'Организация-Сообщения' : организация,
        'Заявка-Почта' : this.Заявка.НомерЗаписи
    } );
    сообщение.Ответить( 'ДОборот', текст, this.НомерЗаписи );
    return "";
}

/**
 * Возвращает категорию договора по его теме из справочника Аналитики
 * @param режим, если 0, возвращает категорию в текстовом виде, иначе row_id записи категории
 * @param тема - тема договора, если не задана, возьмет из объекта
 * @returns {*}
 * Поменял на договор, т.к. с него используется...
 */
кДоговор.prototype.КатегорияАналитики = function( режим, тема ){
    var результат = (режим == 0 ? "" : -1 );
    if( тема == undefined || !тема ){
        if( !this.Объект && this.Прочитать(this.НомерЗаписи) < 0 ) return результат;
        тема = this.Объект.Тема;
    }
    var зКатегории = BufferedReader( ';WITH HierUp AS( ' +
        '   SELECT ROW_ID, Аналитики, Тема ' +
        '   FROM ~Аналитики~ WHERE Тема LIKE :1 AND Аналитики_ADD=1 ' +
        '   UNION ALL ' +
        '   SELECT child.ROW_ID, child.Аналитики, child.Тема ' +
        '   FROM ~Аналитики~ child ' +
        '       JOIN HierUp ON child.ROW_ID=HierUp.Аналитики ' +
        ') ' +
        'SELECT ROW_ID, Тема FROM HierUp WHERE Аналитики = -10', 1, "th,A" );
    зКатегории.УстановитьПараметры( тема );
    if( зКатегории.Следующий() ) результат = режим == 0 ? зКатегории.Тема : зКатегории.ROW_ID;

    return результат;
}

/**
 * получет доступные темы договоров по переданным категориям из справочника 'Аналитики'
 * храняться в виде иерархии, где в корне на папках прописаны имена категорий
 * @param категория1 - первая категория договоров
 * @returns {string} - строка через ',', в которой перечисленны доступные темы договоров
 */
кДоговор.prototype.ПолучитьТемыПоКатегории = function( категория1 ){
    var категории = '';
    for( let кат of arguments ){
        категории += ", '" + кат + "'";
    }
    if( !категории ) return ''; // ничего не передали - выходим

    категории = категории.substr( 2 );
    var темы = '';
    var зКатегории = Query( ";WITH HierUp AS( \
             SELECT ROW_ID, Тема, Аналитики_ADD \
             FROM ~Аналитики~ WHERE Тема IN('КВнедрение', 'КИнсталляция', 'КСопровождение', 'КПродажа', 'ККарьера') AND Аналитики_ADD=0 \
             UNION ALL \
             SELECT child.ROW_ID, child.Тема, child.Аналитики_ADD \
             FROM ~Аналитики~ child \
                  JOIN HierUp ON HierUp.ROW_ID=child.Аналитики \
          ) SELECT ROW_ID, Тема FROM HierUp WHERE Аналитики_ADD=1", 100 );
    зКатегории.УстановитьПараметры();
    while( зКатегории.Следующий() )
        темы += ",'" + зКатегории.Тема + "'";
    if( темы != "" ) темы = темы.substr( 1 );
    return темы;
}