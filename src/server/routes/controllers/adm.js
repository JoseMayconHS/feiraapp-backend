const bcryptjs = require("bcryptjs"),
  Adm = require("../../../data/Schemas/Adm"),
  Product = require("../../../data/Schemas/Product"),
  User = require("../../../data/Schemas/User"),
  functions = require("../../../functions"),
  limit = +process.env.LIMIT_PAGINATION || 10


exports.indexAll = (req, res) => {
  // OK

  try {

    Adm.countDocuments((err, count) => {
      if (err) {
        res.status(500).send()
      } else {
        const { page } = req.params

        Adm.find()
          .limit(limit)
          .skip((limit * page) - limit)
          .sort('-created_at')
          .then(Documents => {
            res.status(200).json({ ok: true, data: Documents, limit, count })
          })
          .catch(e => {
            res.status(500).send()
          })
      }
    })

  } catch(e) {
    res.status(500).send()
  }
}

exports.cards = (req, res) => {
  // OK

  try {
    User.countDocuments((err3, users) => {
      Adm.countDocuments((err4, adms) => {
        Product.countDocuments((err5, products) => {
          res.status(200).json({
            ok: true,
            data: {
              products: typeof products === 'number' ? products : 'falhou ❌',
              users: typeof +users === "number" ? +users : "falhou ❌",
              adms: typeof +adms === "number" ? +adms : "falhou ❌",
            },
          });
        })
      });
    });
  } catch (e) {
    res.status(500).send();
  }
};

exports.toggleUserSignUp = (req, res) => {
  // OK

  try {
    const { id: _id } = req.params;

    const { status } = req.body;

    User.updateOne({ _id }, { status })
      .then(() => {
        res.status(200).send();
      })
      .catch(() => {
        res.status(500).send();
      });
  } catch (err) {
    res.status(500).send();
  }
};

exports.removeUser = (req, res) => {
  // OK

  try {
    const { id: _id } = req.params;

    User.deleteOne({ _id })
      .then(() => {
        res.status(200).send();
      })
      .catch(() => {
        res.status(500).send();
      });
  } catch (err) {
    res.status(500).send();
  }
};

exports.removeAnotherAdm = (req, res) => {
  // OK

  try {
    const { id: _id } = req.params;

    Adm.deleteOne({ _id })
      .then(() => {
        res.status(200).send();
      })
      .catch((e) => {
        res.status(500).send(e);
      });
  } catch (err) {
    res.status(500).send(err);
  }
};

exports.qtd = (req, res) => {
  try {
    Adm.countDocuments((err, count) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(200).json({ count });
      }
    });
  } catch (err) {
    res.status(500).send(err);
  }
};

exports.store = (req, res) => {
  // OK

  try {
    const { username, email, autoLogin } = req.body;
    let { password } = req.body;

    Adm.findOne({ email: email.trim().toLowerCase() })
      .then((admByEmail) => {
        if (!admByEmail) {
          password = functions.criptor(password.trim().toLowerCase());

          Adm.create({
            username: username.trim(),
            email: email.trim().toLowerCase(),
            password,
          })
            .then(({ _doc: data }) => {
              if (autoLogin) {
                functions
                  .token(data)
                  .then((token) => {
                    res
                      .status(201)
                      .json({
                        ok: true,
                        data: {
                          ...data,
                          password: undefined,
                          token
                        },
                      });
                  })
                  .catch(() => {
                    res
                      .status(201)
                      .json({
                        ok: true,
                        data: { ...data, password: undefined },
                      });
                  });
              } else {
                res
                  .status(201)
                  .json({
                    ok: true,
                    data: { ...data, password: undefined },
                  });
              }
            })
            .catch((_) => {
              res.status(200).json({ ok: false, message: "Não criado 😢" });
            });
        } else {
          res
            .status(200)
            .json({ ok: false, message: "Email já existe 🤪" });
        }
      })
      .catch((err) => {
        res.status(500).send(err);
      });
  } catch (err) {
    res.status(500).send(err);
  }
};

exports.sign = (req, res) => {
  // OK

  try {
    const { email, password } = req.body;

    Adm.findOne({ email: email.trim() })
      .then((adm) => {
        try {
          if (!adm) {
            throw "Email não existe 🙄";
          }

          if (
            !bcryptjs.compareSync(password.trim().toLowerCase(), adm.password)
          ) {
            throw "Senha inválida 🙄";
          }

          functions
            .token({ adm: adm._doc.adm, value: adm._doc._id })
            .then((token) => {
              res
                .status(200)
                .json({
                  ok: true,
                  data: {
                    ...adm._doc,
                    password: undefined,
                    token
                  },
                });
            })
            .catch(() => {
              res
                .status(200)
                .json({ ok: false, message: "Erro ao gerar token 💥" });
            });
        } catch (message) {
          res.status(200).json({ ok: false, message });
        }
      })
      .catch((err) => {
        res.status(500).send(err);
      });
  } catch (err) {
    res.status(500).send(err);
  }
};

exports.reconnect = (req, res) => {
  // OK

  try {
    if (!req._id) throw new Error();

    Adm.findById(req._id)
      .then((adm) => {

        if (adm) {
          functions
          .token({ adm: adm._doc.adm, value: adm._doc._id })
          .then((token) => {
            res
              .status(200)
              .json({
                ok: true,
                data: {
                  ...adm._doc,
                  password: undefined,
                  token
                },
              });
          })
          .catch(() => {
            res
              .status(200)
              .json({ ok: false, message: "Erro ao gerar token 💥" });
          });
        } else {
          res.status(200).json({
            ok: false,
            message: 'A sua conta não existe!'
          })
        }
        
      })
      .catch((err) => {
        res.status(500).send();
      });
  } catch (err) {
    res.status(500).send(err);
  }
};


