
/**
* Шлем запросы на получение списка лс
* получение последних показаний лс
* внесение показания по счетчику
* расчет лс
*/

//GET accounts?limit=50&offset=0
//GET accounts/9/lastmeters?limit=50&offset=0
//POST counters/29/metersdata?tariff=0&expense=10&counter=100&date=20150901
//POST accounts/9/calc


/**
* Описание имеющихся ресурсов
*/

/**
* GET 
*/
RestAPIget['accounts'] = function(){ return AccountsController.ВернутьСписок() };
RestAPIget['accounts/id'] = function(){ return AccountsController.ВернутьЛицевой() };
RestAPIget['accounts/id/lastmeters'] = function(){ return AccountsController.ВернутьПоследниеПоказания() };
/**
* POST
*/
RestAPIpost['counters/id/metersdata'] = function(){ return CountersController.ВнестиПоказание() };
RestAPIpost['accounts/id/calc'] = function(){ return AccountsController.Рассчитать() };

var RestAPI = {
    GET : RestAPIget,
    POST : RestAPIpost
};


/**
* Обработка REST запросов
* @class Route
*/
class Route{
   
   /**
   * Основной метод обработки запросов
   */
    static ОбработатьЗапрос( метод, ресурс ){
        var составляющиеРесурса = Route.РазобратьРесурс();
        // есть ли право на ресурс
        if( !Route.RBACtest( метод, оставляющиеРесурса.ресурс ) ){
            /**
             * Здесь граммотно скажем, что нет прав
             */
            return { 'error' }
        }
        var контроллер = Route.ПоискРесурса( метод, составляющиеРесурса.ресурс );
        if( !контроллер ){
            /**
             * скажем что нет такого ресурса
             */
            return { 'error' }
        }
       
        // попытка выполнить запрос
        try{
            return контроллер(составляющиеРесурса.Параметры );
        }
        catch(err){
            /**
             * Создаем правильное сообщение
             */
            return { 'error' }
        }


    }
    
    /**
    * Разбирает полученную строку ресурса на непосредственно ресурс и доп. параметры
    * так же получает и подменяет цифровые идентификаторы
    */
    static РазобратьРесурс( ресурс ){
        var составляющиеРесурса;
        /**
         * обработка ресурса через RegExp
         */
        return составляющиеРесурса;
    }
    
    /**
    *  Осуществляет поиск подходящего ресурса в среди имеющихся ресурсов
    */
    static ПоискРесурса( метод, ресурс ){
        var подходящийРесурс;
        /**
         * ЗДЕСЬ ПОИСК И ПОДБОР СООТВЕТСВУЮЩЕГО РЕСУРСА
         * ЛИБО ВЫВОД ОШИБКИ
         */
        return RestAPI[метод][подходящийРесурс];
    }
    
    /**
    *   Определяет разрешен ли данный ресурс пользователю
    */
    static RBACtest( метод, ресурс){

    }
}


/**
* Описание контроллера для лицевых счетов
*  @class AccountsController
*/
class AccountsController{
   
   /**
   * Возвращает таблицу лицевых счетов в соответсвии с требованиями
   */
    static ВернутьСписок(){
        return new ЛицевыеСчета().ПолучитьСписок( arguments[0], arguments[1], arguments[2] ).toJSON();
    }
    
    /**
    * Возвращает данные по лицевому счету
    */
    static ВернутьЛицевой(){
        return new ЛицевойСчет( arguments[0] ).toJSON();
    }
    
    /**
    * Возвращает список последних показаний по лицевому счету
    */
    static ВернутьПоследниеПоказания(){
        return new ЛицевойСчет( arguments[0] ).ПолучитьСписокПоследнихПоказаний().toJSON();
    }
    
    /**
    * Расчет лицевого счета
    */
    static Рассчитать(){
        return new ЛицевойСчет( arguments[0] ).Рассчитать();
    }
}

/**
*
* @class CountersController
*/
class CountersController{
   
   /**
   *  Внесение показаний счетчика
   */
   static ВнестиПоказание(){
      var счетчик = new Счетчик( arguments[0] );
      var показание = new БазовыйОбъект( "Показания счетчиков" );
      показание.ПрочитатьИзКонтекста( arguments[1] );      
      return счетчик.ВнестиПоказание( показание );
   }
}







